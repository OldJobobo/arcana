import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Wayland
import qs.Commons
import "components"

Item {
  id: root

  property var shell: null
  property var manifest: null
  property var service: null
  property bool opened: false
  property string viewMode: "reading"
  property string pendingRedraw: ""
  property string question: ""
  readonly property var reading: service ? service.currentReading : null
  readonly property int readingRevision: service ? service.readingRevision : 0
  readonly property color cyan: "#62d6df"
  readonly property color ivory: "#e4e0d6"
  readonly property color muted: "#899a9c"
  readonly property color brass: "#b89b61"
  readonly property color fault: "#d97743"
  readonly property color graphite: "#101416"

  function resolveService() {
    if (!service && shell && typeof shell.serviceFor === "function")
      service = shell.serviceFor("org.ministryoftaste.omarchy-arcana")
    return service
  }

  function open(payloadJson) {
    opened = true
    viewMode = "reading"
    pendingRedraw = ""
    resolveService()
    if (service && !service.currentReading) service.requestDaily(false)
    Qt.callLater(function() { keyboardRoot.forceActiveFocus() })
  }

  function close() {
    opened = false
    pendingRedraw = ""
    viewMode = "reading"
  }

  function requestClose() {
    if (shell && typeof shell.hide === "function")
      shell.hide("org.ministryoftaste.omarchy-arcana")
    else close()
  }

  function showDaily() {
    viewMode = "reading"
    pendingRedraw = ""
    if (resolveService()) service.requestDaily(false)
  }

  function drawFree() {
    viewMode = "reading"
    pendingRedraw = ""
    if (resolveService()) service.requestFree()
  }

  function drawSpread() {
    viewMode = "reading"
    pendingRedraw = ""
    if (resolveService()) service.requestSpread()
  }

  function confirmDailyRedraw() {
    if (pendingRedraw === "daily") {
      pendingRedraw = ""
      if (resolveService()) service.requestDaily(true)
    } else pendingRedraw = "daily"
  }

  function openAgentPreview() {
    pendingRedraw = ""
    viewMode = "agent"
    if (resolveService()) service.prepareAgent(question)
  }

  function relationshipText() {
    readingRevision
    if (!reading || !reading.relationships) return ""
    var lines=[]
    for (var i=0;i<reading.relationships.length;i++) lines.push("— "+reading.relationships[i].text)
    return lines.join("\n")
  }

  function patternText() {
    readingRevision
    if (!reading || !reading.patterns || reading.patterns.length===0) return "No dominant spread-wide pattern overrides the individual relationships."
    var lines=[]
    for (var i=0;i<reading.patterns.length;i++) lines.push("— "+reading.patterns[i].text)
    return lines.join("\n")
  }

  function modeLabel() {
    if (!service) return "INITIALIZING"
    if (service.currentReadingKind === "spread") return "CONTEXT / FRICTION / DOORWAY"
    if (service.currentReadingKind === "free") return "FREE DRAW"
    return "DAILY DRAW"
  }

  function agentStatusText() {
    if (!service) return "Service unavailable"
    var s=service.agentStatus
    if (s === "checking") return "Checking Omarchy’s configured default agent…"
    if (s === "unset") return "No default agent is configured on this Omarchy system."
    if (s === "ready") return "Ready to launch “"+service.configuredAgent+"” in the configured terminal."
    if (s === "retry") return "Agent picker opened. Choose an agent, then recheck."
    if (s === "launching") return "Requesting the configured Omarchy agent terminal…"
    if (s === "launched") return "Agent terminal launch requested. Canonical Arcana data remains unchanged."
    if (s === "launch-failed") return "The configured-agent launch failed. The reading remains local and unchanged."
    if (s === "unavailable") return "Omarchy’s default-agent route was unavailable."
    return "Preview the packet before launching an agent."
  }

  PanelWindow {
    id: surface
    screen: Quickshell.screens.length > 0 ? Quickshell.screens[0] : null
    visible: root.opened
    color: "transparent"
    surfaceFormat.opaque: false
    exclusionMode: ExclusionMode.Ignore

    WlrLayershell.namespace: "omarchy-arcana"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: root.opened ? WlrKeyboardFocus.Exclusive : WlrKeyboardFocus.None

    anchors {
      top: true
      bottom: true
      left: true
      right: true
    }

    mask: Region {
      x: frame.x
      y: frame.y
      width: frame.width
      height: frame.height
    }

    FocusScope {
      id: keyboardRoot
      anchors.fill: parent
      focus: true

      Keys.onPressed: function(event) {
        if (questionInput.activeFocus) {
          if (event.key === Qt.Key_Escape) {
            keyboardRoot.forceActiveFocus()
            event.accepted = true
          }
          return
        }
        if (event.key === Qt.Key_Escape || event.key === Qt.Key_Q) {
          if (root.viewMode !== "reading") root.viewMode = "reading"
          else root.requestClose()
          event.accepted = true
        } else if (event.key === Qt.Key_D) {
          root.showDaily(); event.accepted = true
        } else if (event.key === Qt.Key_F) {
          root.drawFree(); event.accepted = true
        } else if (event.key === Qt.Key_S) {
          root.drawSpread(); event.accepted = true
        } else if (event.key === Qt.Key_A) {
          root.openAgentPreview(); event.accepted = true
        } else if (event.key === Qt.Key_I) {
          root.viewMode = "about"; event.accepted = true
        } else if (event.key === Qt.Key_R && root.viewMode === "reading" && root.service && root.service.currentReadingKind === "daily") {
          root.confirmDailyRedraw(); event.accepted = true
        } else if (event.key === Qt.Key_Slash && root.viewMode === "agent") {
          questionInput.forceActiveFocus(); event.accepted = true
        }
      }

      Rectangle {
        id: frame
        anchors.centerIn: parent
        width: Math.min(1080, Math.max(720, surface.width - 72))
        height: Math.min(680, Math.max(580, surface.height - 72))
        radius: 8
        color: root.graphite
        border.width: 1
        border.color: "#3e5558"

        Rectangle {
          anchors.fill: parent
          anchors.margins: -8
          z: -1
          radius: 10
          color: "#60000000"
        }

        Column {
          anchors.fill: parent
          anchors.margins: 24
          spacing: 0

          Item {
            width: parent.width
            height: 58

            Item {
              x: 0
              y: 4
              width: 46
              height: 38
              Rectangle { anchors.centerIn: parent; width: 20; height: 20; rotation: 45; color: "transparent"; border.width: 1; border.color: root.cyan }
              Rectangle { anchors.verticalCenter: parent.verticalCenter; width: 42; height: 1; color: root.cyan; opacity: 0.72 }
              Rectangle { anchors.centerIn: parent; width: 4; height: 4; radius: 2; color: root.cyan }
              Rectangle { x: 38; y: 30; width: 4; height: 4; radius: 2; color: root.brass }
            }

            Column {
              x: 58
              y: 1
              spacing: 3
              Text { text: "OMARCHY ARCANA"; color: root.ivory; font.family: "monospace"; font.pixelSize: 19; font.bold: true; font.letterSpacing: 2.5; textFormat: Text.PlainText }
              Text { text: "ORDER SURROUNDING MYSTERY"; color: root.muted; font.family: "monospace"; font.pixelSize: 9; font.letterSpacing: 2.2; textFormat: Text.PlainText }
            }

            Text {
              anchors.right: closeButton.left
              anchors.rightMargin: 18
              anchors.verticalCenter: parent.verticalCenter
              text: "0.1.0-ALPHA  //  " + root.modeLabel()
              color: root.cyan
              font.family: "monospace"
              font.pixelSize: 9
              font.letterSpacing: 1.1
              textFormat: Text.PlainText
            }

            ArcanaButton {
              id: closeButton
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              text: "ESC  CLOSE"
              compact: true
              onClicked: root.requestClose()
            }
          }

          Rectangle { width: parent.width; height: 1; color: "#334447" }

          Item {
            width: parent.width
            height: 48

            Row {
              anchors.left: parent.left
              anchors.verticalCenter: parent.verticalCenter
              spacing: 8
              ArcanaButton { text: "D  DAILY"; compact: true; selected: root.viewMode === "reading" && root.service && root.service.currentReadingKind === "daily"; onClicked: root.showDaily() }
              ArcanaButton { text: "F  FREE"; compact: true; selected: root.viewMode === "reading" && root.service && root.service.currentReadingKind === "free"; onClicked: root.drawFree() }
              ArcanaButton { text: "S  SPREAD"; compact: true; selected: root.viewMode === "reading" && root.service && root.service.currentReadingKind === "spread"; onClicked: root.drawSpread() }
              ArcanaButton { text: "A  AGENT"; compact: true; selected: root.viewMode === "agent"; onClicked: root.openAgentPreview() }
              ArcanaButton { text: "I  METHOD"; compact: true; selected: root.viewMode === "about"; onClicked: root.viewMode = "about" }
            }

            Text {
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              text: root.pendingRedraw === "daily" ? "PRESS R AGAIN TO REPLACE TODAY’S CARD" : "CANONICAL LOCAL READING"
              color: root.pendingRedraw === "daily" ? root.brass : root.muted
              font.family: "monospace"
              font.pixelSize: 9
              font.letterSpacing: 0.8
              textFormat: Text.PlainText
            }
          }

          Rectangle { width: parent.width; height: 1; color: "#273638" }

          Item {
            id: content
            width: parent.width
            height: frame.height - 24*2 - 58 - 48 - 2 - 31

            Item {
              anchors.fill: parent
              visible: root.viewMode === "reading"

              Row {
                anchors.fill: parent
                anchors.topMargin: 16
                anchors.bottomMargin: 10
                spacing: 20

                Item {
                  id: cardsPane
                  width: root.reading && root.reading.cards && root.reading.cards.length === 3 ? 558 : 330
                  height: parent.height

                  Image {
                    visible: !root.reading
                    anchors.centerIn: parent
                    width: 220
                    height: 385
                    source: Qt.resolvedUrl("assets/cards/card-back.png")
                    fillMode: Image.PreserveAspectFit
                    opacity: 0.74
                  }

                  Row {
                    visible: !!root.reading
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.top: parent.top
                    anchors.topMargin: 10
                    spacing: root.reading && root.reading.cards.length === 3 ? 12 : 0

                    Repeater {
                      model: root.reading ? root.reading.cards : []
                      delegate: CardFace {
                        required property var modelData
                        itemData: modelData
                        cardWidth: root.reading && root.reading.cards.length === 3 ? 178 : 238
                      }
                    }
                  }
                }

                Rectangle { width: 1; height: parent.height; color: "#2d3d40" }

                Flickable {
                  id: readingScroll
                  width: parent.width - cardsPane.width - 21
                  height: parent.height
                  contentWidth: width
                  contentHeight: summaryColumn.implicitHeight
                  clip: true
                  boundsBehavior: Flickable.StopAtBounds

                  Column {
                    id: summaryColumn
                    width: readingScroll.width - 14
                    spacing: 11

                    Text { width: parent.width; text: root.reading ? (root.reading.cards.length === 1 ? root.modeLabel()+"  ·  "+root.reading.cards[0].card.title.toUpperCase() : root.reading.spreadName.toUpperCase()) : "PREPARING DRAW"; color: root.cyan; font.family: "monospace"; font.pixelSize: 11; font.bold: true; font.letterSpacing: 1.2; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { width: parent.width; text: root.reading ? root.reading.synthesis : "Drawing from the complete 78-card system…"; color: root.ivory; font.family: "monospace"; font.pixelSize: 13; lineHeight: 1.35; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Rectangle { width: parent.width; height: 1; color: "#334447" }
                    Text { visible: root.reading && root.reading.relationships.length > 0; width: parent.width; text: "RELATIONSHIPS"; color: root.brass; font.family: "monospace"; font.pixelSize: 9; font.bold: true; font.letterSpacing: 1.2; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.relationships.length > 0; width: parent.width; text: root.relationshipText(); color: root.muted; font.family: "monospace"; font.pixelSize: 11; lineHeight: 1.3; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.cards.length > 1; width: parent.width; text: "SPREAD PATTERN"; color: root.brass; font.family: "monospace"; font.pixelSize: 9; font.bold: true; font.letterSpacing: 1.2; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.cards.length > 1; width: parent.width; text: root.patternText(); color: root.muted; font.family: "monospace"; font.pixelSize: 11; lineHeight: 1.3; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Rectangle { visible: root.reading && root.reading.cards.length > 1; width: parent.width; height: 1; color: "#334447" }
                    Text { width: parent.width; text: "ANOTHER WAY TO READ IT"; color: root.brass; font.family: "monospace"; font.pixelSize: 9; font.bold: true; font.letterSpacing: 1.2; textFormat: Text.PlainText }
                    Text { width: parent.width; text: root.reading ? root.reading.alternative : ""; color: root.ivory; font.family: "monospace"; font.pixelSize: 11; lineHeight: 1.3; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { width: parent.width; text: root.reading ? root.reading.reflection : ""; color: root.cyan; font.family: "monospace"; font.pixelSize: 12; lineHeight: 1.3; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    ArcanaButton { visible: root.service && root.service.currentReadingKind === "daily"; text: root.pendingRedraw === "daily" ? "R  CONFIRM REDRAW" : "R  REDRAW DAILY"; danger: root.pendingRedraw === "daily"; onClicked: root.confirmDailyRedraw() }
                  }
                }
              }
            }

            Item {
              anchors.fill: parent
              visible: root.viewMode === "agent"

              Column {
                anchors.fill: parent
                anchors.topMargin: 18
                anchors.bottomMargin: 12
                spacing: 12

                Text { text: "ASK YOUR AGENT"; color: root.cyan; font.family: "monospace"; font.pixelSize: 14; font.bold: true; font.letterSpacing: 1.8; textFormat: Text.PlainText }
                Text { width: parent.width; text: "Omarchy launches configured agents in unattended / auto-approval modes. Review the exact packet below. Opening the terminal is an explicit action; agent prose is not canonical Arcana data."; color: root.brass; font.family: "monospace"; font.pixelSize: 11; wrapMode: Text.Wrap; textFormat: Text.PlainText }

                Row {
                  width: parent.width
                  height: 40
                  spacing: 10
                  Rectangle {
                    width: parent.width - actionButton.width - 12
                    height: 38
                    radius: 3
                    color: "#161c1e"
                    border.width: questionInput.activeFocus ? 1 : 0
                    border.color: root.cyan
                    TextInput {
                      id: questionInput
                      anchors.fill: parent
                      anchors.margins: 10
                      text: root.question
                      color: root.ivory
                      selectionColor: root.cyan
                      selectedTextColor: root.graphite
                      font.family: "monospace"
                      font.pixelSize: 11
                      clip: true
                      onTextChanged: root.question = text.slice(0,1000)
                      onAccepted: { keyboardRoot.forceActiveFocus(); root.openAgentPreview() }
                    }
                    Text { anchors.fill: parent; anchors.margins: 10; visible: questionInput.text === "" && !questionInput.activeFocus; text: "/  optional question or intention"; color: root.muted; font.family: "monospace"; font.pixelSize: 11; textFormat: Text.PlainText }
                  }
                  ArcanaButton { id: actionButton; text: "REFRESH PACKET"; onClicked: root.openAgentPreview() }
                }

                Text { width: parent.width; text: root.agentStatusText(); color: root.service && root.service.agentStatus === "launch-failed" ? root.fault : root.muted; font.family: "monospace"; font.pixelSize: 10; textFormat: Text.PlainText }

                Rectangle {
                  width: parent.width
                  height: parent.height - 172
                  color: "#0c1012"
                  border.width: 1
                  border.color: "#2d3d40"
                  clip: true

                  Flickable {
                    anchors.fill: parent
                    anchors.margins: 12
                    contentWidth: width
                    contentHeight: packetText.implicitHeight
                    clip: true
                    boundsBehavior: Flickable.StopAtBounds
                    Text {
                      id: packetText
                      width: parent.width
                      text: root.service ? root.service.agentPacket : ""
                      color: "#b7c0be"
                      font.family: "monospace"
                      font.pixelSize: 10
                      lineHeight: 1.25
                      wrapMode: Text.Wrap
                      textFormat: Text.PlainText
                    }
                  }
                }

                Row {
                  spacing: 10
                  ArcanaButton { visible: root.service && (root.service.agentStatus === "unset" || root.service.agentStatus === "retry"); text: root.service && root.service.agentStatus === "retry" ? "RECHECK AGENT" : "CHOOSE DEFAULT AGENT"; onClicked: { if (root.service.agentStatus === "retry") root.openAgentPreview(); else root.service.openAgentPicker() } }
                  ArcanaButton { visible: root.service && root.service.agentStatus === "ready"; text: "LAUNCH " + (root.service ? root.service.configuredAgent.toUpperCase() : "AGENT"); onClicked: root.service.launchAgent() }
                  ArcanaButton { text: "BACK TO READING"; onClicked: { root.viewMode = "reading"; keyboardRoot.forceActiveFocus() } }
                }
              }
            }

            Item {
              anchors.fill: parent
              visible: root.viewMode === "about"

              Row {
                anchors.fill: parent
                anchors.topMargin: 22
                anchors.bottomMargin: 16
                spacing: 30

                Column {
                  width: Math.round(parent.width * 0.47)
                  spacing: 14
                  Text { text: "CONSTRAINED INTERPRETIVE SYNTHESIS"; color: root.cyan; font.family: "monospace"; font.pixelSize: 13; font.bold: true; font.letterSpacing: 1.2; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Arcana is a reflective engine, not factual authority. The canonical reading is composed locally from authored card semantics, orientation, spread position, pairwise relationships, and spread-wide patterns. Alternatives are included only when they remain traceable to the current cards."; color: root.ivory; font.family: "monospace"; font.pixelSize: 12; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Traditional meaning\nModern interpretive range\nOmarchy system translation\nTyped orientation transformation\nPosition grammar\nRelationship edges\nSpread-wide pattern\nDeterministic synthesis\nReflective question"; color: root.muted; font.family: "monospace"; font.pixelSize: 11; lineHeight: 1.35; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                }

                Rectangle { width: 1; height: parent.height; color: "#334447" }

                Column {
                  width: parent.width - Math.round(parent.width * 0.47) - 31
                  spacing: 14
                  Text { text: "PROVENANCE + REALITY SAFETY"; color: root.brass; font.family: "monospace"; font.pixelSize: 13; font.bold: true; font.letterSpacing: 1.2; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Historical anchor: A. E. Waite, public domain\nVault keyword research: user-local reference\nDeck-specific language: original Omarchy Arcana authorship\nComposer: deterministic original method\nAgent response: optional and visibly agent-assisted"; color: root.ivory; font.family: "monospace"; font.pixelSize: 11; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Readings never claim prophecy, diagnosis, guaranteed outcomes, third-party mind access, legal advice, financial advice, or medical advice. Keep agency with the person asking. Ordinary evidence and trusted human support outrank symbolic inference when stakes are real."; color: root.muted; font.family: "monospace"; font.pixelSize: 11; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                  ArcanaButton { text: "BACK TO READING"; onClicked: { root.viewMode = "reading"; keyboardRoot.forceActiveFocus() } }
                }
              }
            }
          }

          Rectangle { width: parent.width; height: 1; color: "#273638" }
          Item {
            width: parent.width
            height: 30
            Text { anchors.left: parent.left; anchors.verticalCenter: parent.verticalCenter; text: "D DAILY   F FREE   S SPREAD   A AGENT   I METHOD   ESC CLOSE"; color: root.muted; font.family: "monospace"; font.pixelSize: 9; font.letterSpacing: 0.65; textFormat: Text.PlainText }
            Text { anchors.right: parent.right; anchors.verticalCenter: parent.verticalCenter; text: "LOCAL READING  //  AGENT PROSE OPTIONAL"; color: root.brass; font.family: "monospace"; font.pixelSize: 9; font.letterSpacing: 0.55; textFormat: Text.PlainText }
          }
        }
      }
    }
  }
}
