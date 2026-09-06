import QtQml
import Quickshell
import Quickshell.Io

ShellRoot {
  id: root
  readonly property string scenario: Quickshell.env("ARCANA_IO_SCENARIO")
  property int attempts: 0
  property int phase: 0
  property string previewPacket: ""
  function check(condition, message) {
    if (!condition) throw new Error(message)
  }
  function done() {
    console.log("ARCANA_IO_PASS=" + scenario)
    tick.stop()
    exitProcess.running = true
  }
  function step() {
    if (scenario === "recovery") {
      if (phase === 0 && service.stateStatus === "invalid") {
        phase = 1
        repair.setText('{"schemaVersion":2}')
      } else if (phase === 1 && service.ready) done()
      return
    }
    if (scenario === "invalid") {
      if (service.stateStatus !== "invalid") return
      check(!service.ready, "invalid state became ready")
      check(!service.requestFree(), "invalid state accepted draw")
      check(service.setUiScale(1.5) === 1, "invalid state accepted preference write")
      check(!service.setFullscreen(true), "invalid state accepted fullscreen write")
      done(); return
    }
    if (!service.ready) return
    if (scenario === "restore" && phase === 3) {
      if (service.stateStatus === "saved") done()
      return
    }
    if (scenario === "restore" && phase === 2) {
      if (service.stateStatus !== "saved") return
      service.setUiScale(1.5)
      phase = 3
      return
    }
    if (scenario === "restore" && phase === 1) {
      if (service.stateStatus !== "saved") return
      service.setUiScale(1.25)
      phase = 2
      return
    }
    if (scenario === "restore") {
      check(service.currentReading !== null, "reading not restored")
      check(service.uiScale === 1.25 && service.themeMode === "system", "preferences not restored")
      check(service.fullscreen, "fullscreen preference not restored")
      check(service.currentReading.originalQuestion === "What can I learn?", "question not restored")
      var readingId = service.currentReading.readingId
      check(service.requestDaily(false), "cached daily rejected")
      check(service.drawStatus !== "collecting", "cached daily requested new entropy")
      check(service.currentReading.cards[0].card.id === service.stateSnapshot().dailySelection[0].cardId, "daily selection changed")
      service.setUiScale(1.25)
      check(service.fullscreen, "scale selection unexpectedly exited fullscreen")
      phase = 1
      return
    }
    if (phase === 0) {
      check(service.requestDaily(false), "daily rejected")
      phase = 1
      return
    }
    if (scenario === "missing-commands") {
      if (phase === 1) {
        if (service.drawStatus !== "entropy-failed") return
        check(service.currentReading === null, "failed entropy produced a reading")
        check(service.stateSnapshot().dailySelection.length === 0, "failed entropy persisted selection")
        check(service.requestDaily(false), "entropy retry rejected")
        service.finishEntropy("controlled-fixture")
        check(service.prepareAgent("What can I learn?"), "preview rejected")
        check(service.copyCurrentReading(), "copy rejected")
        phase = 2
      } else if (service.copyStatus === "copy-failed" && service.agentStatus === "unavailable") done()
      return
    }
    if (!service.currentReading) return
    if (scenario === "agent-handoff") {
      if (phase === 1) {
        check(service.prepareAgent("What can I learn?"), "agent preview rejected")
        previewPacket = service.agentPacket
        phase = 2
      } else if (phase === 2 && service.agentStatus === "ready") {
        check(service.launchAgent(), "explicit launch rejected")
        check(service.lastAgentArgv[3] === previewPacket, "launched packet differs from preview")
        phase = 3
      } else if (phase === 3 && service.agentStatus === "launched" && service.stateStatus === "saved") done()
      return
    }
    if (scenario === "unwritable") {
      if (phase === 2 && service.stateStatus === "saved") { done(); return }
      if (service.stateStatus !== "save-failed") return
      check(service.currentReading.cards.length === 1, "unsaved reading unavailable")
      if (phase === 1) {
        phase = 2
        makeWritable.running = true
      }
      return
    }
    if (phase === 1) {
      service.setUiScale(1.25)
      service.setThemeMode("system")
      service.setFullscreen(true)
      check(service.uiScale === 1.25, "fullscreen replaced saved scale")
      check(service.recomposeWithQuestion("What can I learn?"), "question rejected")
      phase = 2
      return
    }
    if (service.stateStatus === "saved") done()
  }
  ArcanaService { id: service }
  FileView {
    id: repair
    path: root.scenario === "recovery" ? service.effectiveStatePath : ""
    onSaved: service.retryStorage()
  }
  Timer {
    id: tick
    interval: 50
    repeat: true
    running: true
    onTriggered: {
      try {
        root.attempts++
        if (root.attempts > 260) throw new Error("timeout: " + service.stateStatus + "/" + service.drawStatus)
        root.step()
      } catch (error) {
        console.error("ARCANA_IO_FAIL=" + root.scenario + ": " + error)
        stop()
        exitProcess.running = true
      }
    }
  }
  Process {
    id: makeWritable
    command: ["/usr/bin/chmod", "700", service.stateDirectory]
    onExited: function(exitCode) {
      if (exitCode === 0) service.retryStorage()
    }
  }
  Process { id: exitProcess; command: ["/usr/bin/kill", "-TERM", String(Quickshell.processId)] }
}
