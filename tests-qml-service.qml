// Lives at the repository root: Quickshell uses this file's directory as the
// config root and cannot import ArcanaService.qml from outside it.
import QtQml
import Quickshell
import Quickshell.Io
import "src/Interpretation.js" as Interpretation

ShellRoot {
  id: root
  property int attempts: 0

  function check(condition, message) {
    if (!condition) throw new Error(message)
  }

  function runBoundaryTest() {
    check(service.ready, "service did not become migration-ready")
    check(!service.fullscreen, "fresh state unexpectedly fullscreen")
    service.setUiScale(1.25)
    check(service.toggleFullscreen(), "fullscreen toggle did not enter")
    check(service.uiScale === 1.25, "fullscreen changed saved scale")
    check(!service.toggleFullscreen(), "fullscreen toggle did not exit")
    service.setFullscreen(true)
    service.setUiScale(1)
    check(service.fullscreen, "scale unexpectedly exited fullscreen")
    service.setFullscreen(false)
    check(service.requestSpread(), "spread request rejected")
    check(service.drawStatus === "collecting", "controlled entropy seam not armed")
    service.finishEntropy("1")
    check(service.currentReading.cards.length === 3, "three-card reading missing")
    check(service.currentReading.spreadName === "Context / Friction / Doorway", "spread title mismatch")
    check(service.prepareAgent(""), "optional empty question rejected")
    check(service.currentReading.originalQuestion === null, "empty question was not absent")
    check(service.prepareAgent("   "), "optional whitespace question rejected")
    var questionlessId=service.currentSemanticReading.id
    check(service.prepareAgent("Will this definitely work?"), "question recomposition failed")
    check(service.currentSemanticReading.id !== questionlessId, "question did not create a new semantic reading")
    check(service.currentReading.originalQuestion === "Will this definitely work?", "original question missing")
    check(service.currentReading.reframeReason === "prediction", "safety reframe missing")
    var packetText=service.agentPacket
    var packet=Interpretation.handoffPacket(packetText)
    check(packetText.indexOf("# Arcana reading\n") === 0, "handoff preamble missing")
    check(packet.semantic.readingId === service.currentReading.readingId, "preview reading ID mismatch")
    check(packet.question.normalized === service.currentReading.normalizedQuestion, "preview question mismatch")
    check(service.copyCurrentReading(), "copy projection failed")
    check(service.lastCopyArgv.length === 1 && service.lastCopyArgv[0] === "wl-copy", "copy must pass text through stdin, not argv")
    check(service.lastCopyText.indexOf(service.currentReading.cards[0].card.title) >= 0, "readable copy card title missing")
    check(service.lastCopyText.indexOf(service.currentReading.originalQuestion) >= 0, "copy question missing")
    check(service.copyCurrentReading("evidence"), "evidence copy failed")
    check(service.lastCopyText.indexOf(service.currentReading.readingId) >= 0, "evidence copy reading ID missing")
    check(service.launchAgent(), "agent launch preparation failed")
    check(service.lastAgentArgv.length === 4, "agent argv cardinality mismatch")
    check(service.lastAgentArgv[0] === "omarchy" && service.lastAgentArgv[1] === "agent" && service.lastAgentArgv[2] === "prompt", "agent argv prefix mismatch")
    check(service.lastHandoffText === packetText, "handoff file text does not equal preview")
    check(service.lastAgentArgv[3] === service.handoffPrompt() && service.lastAgentArgv[3].indexOf(service.handoffPath) >= 0, "agent prompt does not point at the handoff file")
    check(service.lastAgentArgv[3].length < 1024 && service.lastAgentArgv[3].indexOf(packetText) < 0, "packet leaked into argv")
    check(service.prepareAgent("predict my fate"), "fortune-telling question was rejected instead of reframed")
    check(service.currentReading.reframeReason === "prediction", "fortune-telling question was not reframed")
    var historyBefore = service.history.length
    check(historyBefore >= 1, "draw was not recorded in history")
    check(service.prepareAgent("What next?") && service.history.length === historyBefore, "question recomposition added history")
    var beforeFailure = service.currentReading.readingId
    check(service.requestFree(), "free request rejected")
    check(!service.requestFree(), "concurrent entropy request accepted")
    service.failPendingDraw()
    check(service.currentReading.readingId === beforeFailure, "entropy failure replaced reading")
    check(service.requestDaily(false), "daily request rejected")
    service.finishEntropy("2")
    var dailyId = service.currentSemanticReading.id
    var dailyHistory = service.history.length
    check(service.requestDaily(false) && service.currentSemanticReading.id === dailyId, "showing today's daily again recomposed it")
    check(service.history.length === dailyHistory, "re-showing daily added history")
    check(!service.dailyIsStale(), "today's daily reported stale")
    var yesterday = service.stateSnapshot()
    yesterday.dailyDate = "2000-01-01"
    service.applyState(yesterday)
    check(service.dailyIsStale(), "an earlier day's daily was not reported stale")
    check(service.restoredReadingDate(yesterday) === "2000-01-01", "restored daily lost its draw date")
    var restoredFree = service.stateSnapshot()
    restoredFree.lastReadingKind = "free"
    check(service.restoredReadingDate(restoredFree) === "", "restored free draw was given a daily date")
    check(service.requestDaily(false) && service.drawStatus === "collecting", "stale daily did not request a fresh draw")
    service.finishEntropy("3")
    check(!service.dailyIsStale(), "fresh daily still reported stale")
    check(service.readingText("text").indexOf("· " + service.localDateKey()) >= 0, "fresh daily copy lacks today's date")
    var question = "What should I notice?"
    check(service.recomposeWithQuestion(question) && service.currentReadingDate === service.localDateKey(), "question recomposition lost the reading date")
    dailyHistory = service.history.length
    check(service.restoreHistory(dailyHistory - 1), "history restore failed")
    check(service.history.length === dailyHistory, "history restore added history")
    check(!service.setReversals(false) && !service.reversals, "reversal preference did not toggle")
    service.setReversals(true)
    console.log("ARCANA_SERVICE_TEST_PASS")
  }

  ArcanaService {
    id: service
    testMode: true
    statePathOverride: Qt.resolvedUrl("tests/fixtures/nonexistent-semantic-state.json")
    Component.onCompleted: {
      loadDeck()
      loadSpreads()
      restoreMigratedState()
    }
  }

  Timer {
    interval: 25
    repeat: true
    running: true
    onTriggered: {
      root.attempts++
      if (!service.ready && root.attempts < 80) return
      running=false
      try { root.runBoundaryTest() }
      catch (error) { console.error("ARCANA_SERVICE_TEST_FAIL="+error) }
      exitProcess.running=true
    }
  }

  Process {
    id: exitProcess
    command: ["kill", "-TERM", String(Quickshell.processId)]
    running: false
  }
}
