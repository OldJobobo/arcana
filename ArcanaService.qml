import QtQuick
import Quickshell
import Quickshell.Io
import "src/Arcana.js" as Arcana
import "src/Interpretation.js" as Interpretation
import "src/Settings.js" as Settings

Item {
  id: root
  visible: false

  property var shell: null
  property var manifest: null
  readonly property string pluginId: "org.ministryoftaste.arcana"
  readonly property string home: Quickshell.env("HOME") || ""
  readonly property string stateBase: (Quickshell.env("XDG_STATE_HOME") || home + "/.local/state") + "/omarchy"
  readonly property string statePath: stateBase + "/arcana.json"
  property bool testMode: false
  property string statePathOverride: ""
  readonly property string effectiveStatePath: statePathOverride === "" ? statePath : statePathOverride
  readonly property string agentContextDir: stateBase + "/arcana-agent-context"
  property var deckDocument: ({schemaVersion: 0, cards: []})
  property var spreadDocument: ({schemaVersion: 0, spreads: []})
  readonly property var cards: deckDocument.cards || []
  property bool semanticReady: false
  readonly property bool ready: semanticReady && cards.length === 78 && stateMigrationApplied
  property bool stateLoaded: false
  property bool stateMigrationApplied: false

  property var currentSemanticReading: null
  property var currentReading: null
  property string currentReadingKind: "daily"
  property int readingRevision: 0
  property string pendingDrawKind: ""
  property int pendingCount: 1
  property bool pendingDailyForce: false
  property string pendingEntropy: ""
  property string drawStatus: "idle"
  property string agentPacket: ""
  property string configuredAgent: ""
  property string agentStatus: "idle"
  property bool agentLaunchRunning: false
  property var lastCopyArgv: []
  property var lastAgentArgv: []
  property string copyStatus: "idle"
  property real uiScale: 1
  property string themeMode: "arcana"

  signal readingUpdated()

  function localDateKey() {
    return Qt.formatDate(new Date(), "yyyy-MM-dd")
  }

  function reversalsEnabled() {
    var p = stateAdapter.preferences || ({})
    return p.reversals !== false
  }

  function persistState() {
    if (!testMode) stateStore.writeAdapter()
  }

  function restorePreferences() {
    var preferences = stateAdapter.preferences || ({})
    uiScale = Settings.normalizeScale(preferences.uiScale)
    themeMode = Settings.normalizeThemeMode(preferences.themeMode)
  }

  function finishStateLoad() {
    if (stateLoaded) return
    stateLoaded = true
    restorePreferences()
    restoreMigratedState()
  }

  function handleStateLoadFailure(error) {
    if (error === FileViewError.FileNotFound) {
      finishStateLoad()
      return
    }
    stateLoaded = false
    stateMigrationApplied = false
    console.warn("Arcana state load failed closed:", FileViewError.toString(error))
  }

  function setUiScale(value) {
    var next = Settings.normalizeScale(value)
    var preferences = JSON.parse(JSON.stringify(stateAdapter.preferences || ({})))
    preferences.uiScale = next
    stateAdapter.preferences = preferences
    uiScale = next
    persistState()
    return next
  }

  function setThemeMode(value) {
    var next = Settings.normalizeThemeMode(value)
    var preferences = JSON.parse(JSON.stringify(stateAdapter.preferences || ({})))
    preferences.themeMode = next
    stateAdapter.preferences = preferences
    themeMode = next
    persistState()
    return next
  }

  function toggleThemeMode() {
    return setThemeMode(themeMode === "system" ? "arcana" : "system")
  }

  function deckSnapshot() {
    return JSON.parse(JSON.stringify(deckDocument || ({})))
  }

  function spreadSnapshot() {
    return JSON.parse(JSON.stringify(spreadDocument || ({})))
  }

  function validateDocuments() {
    semanticReady = false
    if (deckDocument.schemaVersion !== 2 || spreadDocument.schemaVersion !== 1) return
    try {
      Interpretation.validateCatalog(deckSnapshot(), spreadSnapshot())
      semanticReady = cards.length === 78
      if (semanticReady) restoreMigratedState()
    } catch (error) {
      console.warn("Arcana rejected semantic-v2 assets:", error)
    }
  }

  function loadDeck() {
    try {
      var parsed = JSON.parse(deckStore.text() || "{}")
      deckDocument = parsed && parsed.schemaVersion === 2 && parsed.cards ? parsed : ({schemaVersion: 0, cards: []})
    } catch (error) {
      deckDocument = ({schemaVersion: 0, cards: []})
      console.warn("Arcana could not parse assets/semantic-v2/cards.json:", error)
    }
    validateDocuments()
  }

  function loadSpreads() {
    try {
      var parsed = JSON.parse(spreadStore.text() || "{}")
      spreadDocument = parsed && parsed.schemaVersion === 1 && parsed.spreads ? parsed : ({schemaVersion: 0, spreads: []})
    } catch (error) {
      spreadDocument = ({schemaVersion: 0, spreads: []})
      console.warn("Arcana could not parse assets/spreads.json:", error)
    }
    validateDocuments()
  }

  function selectionSnapshot(selection) {
    return JSON.parse(JSON.stringify(selection || []))
  }

  function persistedDailyIsCurrent() {
    return stateAdapter.dailyDate === localDateKey()
      && stateAdapter.dailySelection
      && stateAdapter.dailySelection.length === 1
  }

  function stateSnapshot() {
    return JSON.parse(JSON.stringify({schemaVersion:stateAdapter.schemaVersion,dailyDate:stateAdapter.dailyDate,dailySeed:stateAdapter.dailySeed,dailySelection:stateAdapter.dailySelection,lastReadingSelection:stateAdapter.lastReadingSelection,lastReading:stateAdapter.lastReading,lastReadingKind:stateAdapter.lastReadingKind,freeCounter:stateAdapter.freeCounter,preferences:stateAdapter.preferences,migration:stateAdapter.migration}))
  }

  function applyState(next) {
    stateAdapter.schemaVersion = next.schemaVersion
    stateAdapter.dailyDate = next.dailyDate
    stateAdapter.dailySeed = next.dailySeed
    stateAdapter.dailySelection = next.dailySelection
    stateAdapter.lastReadingSelection = next.lastReadingSelection
    stateAdapter.lastReading = next.lastReading
    stateAdapter.lastReadingKind = next.lastReadingKind
    stateAdapter.freeCounter = next.freeCounter
    stateAdapter.preferences = next.preferences
    stateAdapter.migration = next.migration
  }

  function restoreMigratedState() {
    if (!semanticReady || !stateLoaded || stateMigrationApplied) return
    try {
      var before = stateSnapshot()
      var migrated = Interpretation.migrateState(deckSnapshot(), spreadSnapshot(), before)
      applyState(migrated)
      stateMigrationApplied = true
      restorePreferences()
      if (migrated.lastReading) {
        currentSemanticReading = migrated.lastReading
        currentReadingKind = String(migrated.lastReadingKind || "daily")
        currentReading = Interpretation.toPanelReading(deckSnapshot(), spreadSnapshot(), currentSemanticReading, {kind:currentReadingKind,createdAt:null})
        readingRevision++
        readingUpdated()
      }
      if (JSON.stringify(before) !== JSON.stringify(migrated)) persistState()
    } catch (error) {
      stateMigrationApplied = false
      currentSemanticReading = null
      currentReading = null
      console.warn("Arcana state migration failed closed:", error)
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
    pendingEntropy = ""
    drawStatus = "collecting"
    if (!testMode) entropyProcess.running = true
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
    pendingEntropy = ""
    drawStatus = "collecting"
    if (!testMode) entropyProcess.running = true
    return true
  }

  function failPendingDraw() {
    pendingDrawKind = ""
    pendingCount = 1
    pendingDailyForce = false
    pendingEntropy = ""
    drawStatus = "entropy-failed"
  }

  function finishEntropy(raw) {
    if (pendingDrawKind === "" || !ready) return
    var entropy = String(raw || "").trim()
    if (entropy === "") { failPendingDraw(); return }
    var kind = pendingDrawKind
    var count = pendingCount
    pendingDrawKind = ""
    pendingCount = 1
    pendingEntropy = ""
    drawStatus = "ready"
    var seed = kind === "daily"
      ? Arcana.dailyKeyV2(localDateKey()) + ":" + entropy
      : kind + ":" + entropy + ":" + String(Number(stateAdapter.freeCounter || 0))
    var selection = Arcana.drawV2(root.cards, {seed: seed, count: count, reversals: reversalsEnabled()})
    if (kind === "daily") {
      stateAdapter.dailyDate = localDateKey()
      stateAdapter.dailySeed = seed
      stateAdapter.dailySelection = selection
    } else {
      stateAdapter.freeCounter = Number(stateAdapter.freeCounter || 0) + 1
    }
    setReading(kind, selection, count === 3 ? "context-friction-doorway" : "single")
  }

  function positionedSelection(selection, spreadId) {
    var source = selectionSnapshot(selection)
    var positions = spreadId === "context-friction-doorway" ? ["context","friction","doorway"] : ["single"]
    var output = []
    for (var i = 0; i < source.length; i++) output.push({positionId:positions[i],cardId:source[i].cardId,orientation:source[i].orientation})
    return output
  }

  function composeSemantic(kind, selection, spreadId, question) {
    var policy = reversalsEnabled() ? "energy_state" : "none"
    var reading = Interpretation.interpret(deckSnapshot(), spreadSnapshot(), {spreadId:spreadId,cards:positionedSelection(selection,spreadId),originalQuestion:question === undefined ? null : question,topicLens:"general",tradition:"rws",reversalPolicy:policy,elementalDignity:"disabled",narratorId:"clear-reflective-v1"})
    var createdAt = new Date().toISOString()
    currentSemanticReading = reading
    currentReadingKind = kind
    currentReading = Interpretation.toPanelReading(deckSnapshot(), spreadSnapshot(), reading, {kind:kind,createdAt:createdAt})
    readingRevision++
    stateAdapter.lastReading = reading
    stateAdapter.lastReadingSelection = positionedSelection(selection,spreadId)
    stateAdapter.lastReadingKind = kind
    persistState()
    readingUpdated()
    return reading
  }

  function setReading(kind, selection, spreadId) {
    try { composeSemantic(kind, selection, spreadId, null); return true }
    catch (error) { console.warn("Arcana interpretation failed closed:", error); return false }
  }

  function recomposeWithQuestion(question) {
    if (!currentSemanticReading) return false
    try {
      var selection = currentSemanticReading.cards.map(function(item) { return {cardId:item.cardId,orientation:item.orientation} })
      composeSemantic(currentReadingKind, selection, currentSemanticReading.spreadId, String(question || ""))
      return true
    } catch (error) {
      console.warn("Arcana question recomposition failed closed:", error)
      return false
    }
  }

  function prepareAgent(question) {
    if (!currentSemanticReading || !recomposeWithQuestion(question)) {
      agentStatus = "no-reading"
      return false
    }
    agentPacket = Interpretation.buildHandoff(deckSnapshot(), spreadSnapshot(), currentSemanticReading)
    if (testMode) {
      configuredAgent = "test-agent"
      agentStatus = "ready"
    } else {
      configuredAgent = ""
      agentStatus = "checking"
      if (!agentGetter.running) agentGetter.running = true
    }
    return true
  }

  function copyCurrentReading() {
    if (!currentSemanticReading || copyProcess.running) return false
    try {
      var text = Interpretation.copyReading(deckSnapshot(), spreadSnapshot(), currentSemanticReading, 8000)
      lastCopyArgv = ["wl-copy", text]
      copyProcess.command = lastCopyArgv
      copyStatus = testMode ? "copied" : "copying"
      if (!testMode) copyProcess.running = true
      return true
    } catch (error) {
      copyStatus = "copy-failed"
      console.warn("Arcana copy projection failed closed:", error)
      return false
    }
  }

  function openAgentPicker() {
    if (!agentPicker.running) agentPicker.running = true
  }

  function launchAgent() {
    if (agentStatus !== "ready" || configuredAgent === "" || agentPacket === "" || agentLaunch.running)
      return false
    agentStatus = "launching"
    agentLaunchRunning = true
    lastAgentArgv = ["omarchy", "agent", "prompt", root.agentPacket]
    agentLaunch.command = lastAgentArgv
    if (!testMode) agentLaunch.running = true
    return true
  }

  FileView {
    id: deckStore
    path: Qt.resolvedUrl("assets/semantic-v2/cards.json")
    blockLoading: true
    printErrors: true
    onLoaded: root.loadDeck()
  }

  FileView {
    id: spreadStore
    path: Qt.resolvedUrl("assets/spreads.json")
    blockLoading: true
    printErrors: true
    onLoaded: root.loadSpreads()
  }

  FileView {
    id: stateStore
    path: root.effectiveStatePath
    atomicWrites: true
    blockLoading: true
    watchChanges: true
    printErrors: false
    onLoaded: root.finishStateLoad()
    onLoadFailed: function(error) { root.handleStateLoadFailure(error) }
    onFileChanged: reload()
    adapter: JsonAdapter {
      id: stateAdapter
      property int schemaVersion: 2
      property string dailyDate: ""
      property string dailySeed: ""
      property var dailySelection: []
      property var lastReadingSelection: []
      property var lastReading: null
      property string lastReadingKind: "daily"
      property int freeCounter: 0
      property var preferences: ({reversals:true, uiScale:1, themeMode:"arcana"})
      property var migration: ({fromSchemaVersion:2, legacyReadingRecovered:false})
    }
  }

  Process {
    id: contextDirectory
    command: ["mkdir", "-p", root.agentContextDir]
    running: !root.testMode
  }

  Process {
    id: entropyProcess
    command: ["od", "-An", "-N", "8", "-tu8", "/dev/urandom"]
    running: false
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.pendingEntropy = String(text || "").trim()
    }
    onExited: function(exitCode) {
      if (exitCode === 0) root.finishEntropy(root.pendingEntropy)
      else root.failPendingDraw()
    }
  }

  Process {
    id: copyProcess
    running: false
    onExited: function(exitCode) { root.copyStatus = exitCode === 0 ? "copied" : "copy-failed" }
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
    target: "org.ministryoftaste.arcana.service"
    function status(arg: string): string {
      return JSON.stringify({ready:root.ready,stateLoaded:root.stateLoaded,migrationApplied:root.stateMigrationApplied,cards:root.cards.length,kind:root.currentReadingKind,readingId:root.currentSemanticReading ? root.currentSemanticReading.id : null,drawStatus:root.drawStatus,agentStatus:root.agentStatus,scale:root.uiScale,theme:root.themeMode})
    }
    function daily(arg: string): string { return root.requestDaily(false) ? "ok" : "busy" }
    function free(arg: string): string { return root.requestFree() ? "ok" : "busy" }
    function spread(arg: string): string { return root.requestSpread() ? "ok" : "busy" }
    function scale(arg: string): string { return String(root.setUiScale(Number(arg))) }
    function theme(arg: string): string { return root.setThemeMode(String(arg)) }
  }

  Component.onCompleted: {
    loadDeck()
    loadSpreads()
    restorePreferences()
    restoreMigratedState()
  }
}
