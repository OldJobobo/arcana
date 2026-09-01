import QtQuick
import Quickshell
import Quickshell.Io
import "src/Arcana.js" as Arcana

Item {
  id: root
  visible: false

  property var shell: null
  property var manifest: null
  readonly property string pluginId: "org.ministryoftaste.omarchy-arcana"
  readonly property string home: Quickshell.env("HOME") || ""
  readonly property string stateBase: (Quickshell.env("XDG_STATE_HOME") || home + "/.local/state") + "/omarchy"
  readonly property string statePath: stateBase + "/omarchy-arcana.json"
  readonly property string agentContextDir: stateBase + "/arcana-agent-context"
  readonly property var cards: deckAdapter.cards || []
  readonly property bool ready: cards.length === 78

  property var currentReading: null
  property string currentReadingKind: "daily"
  property int readingRevision: 0
  property string pendingDrawKind: ""
  property int pendingCount: 1
  property bool pendingDailyForce: false
  property string agentPacket: ""
  property string configuredAgent: ""
  property string agentStatus: "idle"
  property bool agentLaunchRunning: false

  signal readingUpdated()

  function localDateKey() {
    return Qt.formatDate(new Date(), "yyyy-MM-dd")
  }

  function reversalsEnabled() {
    var p = stateAdapter.preferences || ({})
    return p.reversals !== false
  }

  function persistedDailyIsCurrent() {
    return stateAdapter.dailyDate === localDateKey()
      && Array.isArray(stateAdapter.dailySelection)
      && stateAdapter.dailySelection.length === 1
  }

  function restoreLastReading() {
    if (stateAdapter.lastReading && stateAdapter.lastReading.schemaVersion === 1) {
      currentReading = stateAdapter.lastReading
      currentReadingKind = String(stateAdapter.lastReadingKind || "daily")
      readingRevision++
      readingUpdated()
    }
  }

  function requestDaily(force) {
    if (!ready || entropyProcess.running) return false
    if (force !== true && persistedDailyIsCurrent()) {
      setReading("daily", stateAdapter.dailySelection, "single")
      return true
    }
    pendingDrawKind = "daily"
    pendingCount = 1
    pendingDailyForce = force === true
    entropyProcess.running = true
    return true
  }

  function requestFree() {
    return requestRandom("free", 1)
  }

  function requestSpread() {
    return requestRandom("spread", 3)
  }

  function requestRandom(kind, count) {
    if (!ready || entropyProcess.running) return false
    pendingDrawKind = kind
    pendingCount = count
    pendingDailyForce = false
    entropyProcess.running = true
    return true
  }

  function finishEntropy(raw) {
    if (pendingDrawKind === "" || !ready) return
    var entropy = String(raw || "").trim()
    if (entropy === "") entropy = String(Date.now())
    var kind = pendingDrawKind
    var count = pendingCount
    pendingDrawKind = ""
    pendingCount = 1
    var seed = kind === "daily"
      ? Arcana.dailyKey(localDateKey()) + ":" + entropy
      : kind + ":" + entropy + ":" + String(Number(stateAdapter.freeCounter || 0))
    var selection = Arcana.draw(cards, {seed: seed, count: count, reversals: reversalsEnabled()})
    if (kind === "daily") {
      stateAdapter.dailyDate = localDateKey()
      stateAdapter.dailySeed = seed
      stateAdapter.dailySelection = selection
    } else {
      stateAdapter.freeCounter = Number(stateAdapter.freeCounter || 0) + 1
    }
    setReading(kind, selection, count === 3 ? "context-friction-doorway" : "single")
  }

  function setReading(kind, selection, spreadId) {
    var reading = Arcana.compose(cards, selection, spreadId)
    reading.createdAt = new Date().toISOString()
    reading.kind = kind
    currentReading = reading
    currentReadingKind = kind
    readingRevision++
    stateAdapter.lastReading = reading
    stateAdapter.lastReadingKind = kind
    stateStore.writeAdapter()
    readingUpdated()
  }

  function prepareAgent(question) {
    if (!currentReading) {
      agentStatus = "no-reading"
      return false
    }
    agentPacket = Arcana.buildHandoff(currentReading, question)
    configuredAgent = ""
    agentStatus = "checking"
    if (!agentGetter.running) agentGetter.running = true
    return true
  }

  function openAgentPicker() {
    if (!agentPicker.running) agentPicker.running = true
  }

  function launchAgent() {
    if (agentStatus !== "ready" || configuredAgent === "" || agentPacket === "" || agentLaunch.running)
      return false
    agentStatus = "launching"
    agentLaunchRunning = true
    agentLaunch.command = ["omarchy", "agent", "prompt", root.agentPacket]
    agentLaunch.running = true
    return true
  }

  FileView {
    id: deckStore
    path: Qt.resolvedUrl("assets/cards.json")
    blockLoading: true
    printErrors: true
    adapter: JsonAdapter {
      id: deckAdapter
      property int schemaVersion: 1
      property string methodVersion: ""
      property var cards: []
    }
  }

  FileView {
    id: stateStore
    path: root.statePath
    atomicWrites: true
    blockLoading: true
    watchChanges: true
    printErrors: false
    onLoaded: root.restoreLastReading()
    onFileChanged: reload()
    adapter: JsonAdapter {
      id: stateAdapter
      property int schemaVersion: 1
      property string dailyDate: ""
      property string dailySeed: ""
      property var dailySelection: []
      property var lastReading: null
      property string lastReadingKind: "daily"
      property int freeCounter: 0
      property var preferences: ({reversals: true})
    }
  }

  Process {
    id: contextDirectory
    command: ["mkdir", "-p", root.agentContextDir]
    running: true
  }

  Process {
    id: entropyProcess
    command: ["od", "-An", "-N", "8", "-tu8", "/dev/urandom"]
    running: false
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.finishEntropy(text)
    }
    onExited: function(exitCode) {
      if (exitCode !== 0 && root.pendingDrawKind !== "") root.finishEntropy(String(Date.now()))
    }
  }

  Process {
    id: agentGetter
    command: ["omarchy", "default", "agent"]
    running: false
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.configuredAgent = String(text || "").trim()
    }
    onExited: function(exitCode) {
      if (exitCode !== 0) root.agentStatus = "unavailable"
      else if (root.configuredAgent === "") root.agentStatus = "unset"
      else root.agentStatus = "ready"
    }
  }

  Process {
    id: agentPicker
    command: ["omarchy-menu", "summon", "setup.default.agent"]
    running: false
    onExited: root.agentStatus = "retry"
  }

  Process {
    id: agentLaunch
    workingDirectory: root.agentContextDir
    running: false
    onExited: function(exitCode) {
      root.agentLaunchRunning = false
      root.agentStatus = exitCode === 0 ? "launched" : "launch-failed"
    }
  }

  IpcHandler {
    target: "org.ministryoftaste.omarchy-arcana.service"
    function status(): string {
      return JSON.stringify({ready:root.ready,cards:root.cards.length,kind:root.currentReadingKind,agentStatus:root.agentStatus})
    }
    function daily(): string { return root.requestDaily(false) ? "ok" : "busy" }
    function free(): string { return root.requestFree() ? "ok" : "busy" }
    function spread(): string { return root.requestSpread() ? "ok" : "busy" }
  }

  Component.onCompleted: {
    if (stateAdapter.lastReading) restoreLastReading()
  }
}
