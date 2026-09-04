import QtQml
import Quickshell
import Quickshell.Io

ShellRoot {
  id: root
  property int attempts: 0

  function check(condition, message) {
    if (!condition) throw new Error(message)
  }

  function runBoundaryTest() {
    check(service.ready, "service did not become migration-ready")
    check(service.requestSpread(), "spread request rejected")
    check(service.drawStatus === "collecting", "controlled entropy seam not armed")
    service.finishEntropy("1")
    check(service.currentReading.cards.length === 3, "three-card reading missing")
    check(service.currentReading.spreadName === "Context / Friction / Doorway", "spread title mismatch")
    var questionlessId=service.currentSemanticReading.id
    check(service.prepareAgent("Will this definitely work?"), "question recomposition failed")
    check(service.currentSemanticReading.id !== questionlessId, "question did not create a new semantic reading")
    check(service.currentReading.originalQuestion === "Will this definitely work?", "original question missing")
    check(service.currentReading.reframeReason === "prediction", "safety reframe missing")
    var packetText=service.agentPacket
    var packet=JSON.parse(packetText)
    check(packet.semantic.readingId === service.currentReading.readingId, "preview reading ID mismatch")
    check(packet.question.normalized === service.currentReading.normalizedQuestion, "preview question mismatch")
    check(service.copyCurrentReading(), "copy projection failed")
    check(service.lastCopyArgv.length === 2 && service.lastCopyArgv[0] === "wl-copy", "copy argv shape mismatch")
    check(service.lastCopyArgv[1].indexOf(service.currentReading.readingId) >= 0, "copy reading ID missing")
    check(service.lastCopyArgv[1].indexOf(service.currentReading.originalQuestion) >= 0, "copy question missing")
    check(service.launchAgent(), "agent launch preparation failed")
    check(service.lastAgentArgv.length === 4, "agent argv cardinality mismatch")
    check(service.lastAgentArgv[0] === "omarchy" && service.lastAgentArgv[1] === "agent" && service.lastAgentArgv[2] === "prompt", "agent argv prefix mismatch")
    check(service.lastAgentArgv[3] === packetText, "preview does not equal one-element argv packet")
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
