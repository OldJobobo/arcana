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
  property bool expandedReading: false
  property string pendingRedraw: ""
  property string question: ""
  property bool veilNextReading: false
  property var revealedCards: ({})
  property bool cardsComplete: true
  property bool inspectionOpen: false
  property var inspectionItem: null
  property real inspectionProgress: 0
  readonly property var reading: service ? service.currentReading : null
  readonly property int readingRevision: service ? service.readingRevision : 0
  readonly property bool systemTheme: service && service.themeMode === "system"
  property color cyan: systemTheme ? Color.accent : "#62d6df"
  property color ivory: systemTheme ? Color.popups.text : "#e4e0d6"
  property color muted: systemTheme ? Color.muted : "#899a9c"
  property color brass: systemTheme ? Color.popups.border : "#b89b61"
  property color fault: systemTheme ? Color.urgent : "#d97743"
  property color graphite: systemTheme ? Color.popups.background : "#101416"
  property color panelBorder: systemTheme ? Color.popups.border : "#3e5558"
  property color artContrastSurface: "#10151a"
  property color rawArtPrimary: systemTheme ? Color.accent : "#469bff"
  property color rawArtSecondary: systemTheme
    ? Qt.rgba((Color.accent.r * 0.68) + (Color.popups.text.r * 0.32),
        (Color.accent.g * 0.68) + (Color.popups.text.g * 0.32),
        (Color.accent.b * 0.68) + (Color.popups.text.b * 0.32), 1)
    : "#71d4e6"
  property color rawArtFault: systemTheme ? Color.urgent : "#f15b4a"
  property color artPrimary: contrastGuard(rawArtPrimary, "#469bff", 3)
  property color artSecondary: contrastGuard(rawArtSecondary, "#71d4e6", 3)
  property color artFault: contrastGuard(rawArtFault, "#f15b4a", 3)
  readonly property real baseWidth: 1080
  readonly property real baseHeight: 680
  readonly property real selectedScale: service ? service.uiScale : 1
  readonly property real effectiveScale: Math.min(selectedScale,
    Math.max(0.5, (surface.width - 48) / baseWidth),
    Math.max(0.5, (surface.height - 48) / baseHeight))
  readonly property real inspectionWidth: Math.min(480,
    Math.max(220, surface.width - 120),
    Math.max(220, (surface.height - 150) / 1.75))
  property real renderScale: effectiveScale
  property real revealOpacity: 0
  property real revealOffset: 16
  property real contentOpacity: 0
  property real contentOffset: 12
  property real readingOpacity: 1

  function linearChannel(channel) {
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  }

  function relativeLuminance(color) {
    return (0.2126 * linearChannel(color.r))
      + (0.7152 * linearChannel(color.g))
      + (0.0722 * linearChannel(color.b))
  }

  function contrastRatio(first, second) {
    var firstLuminance = relativeLuminance(first)
    var secondLuminance = relativeLuminance(second)
    var lighter = Math.max(firstLuminance, secondLuminance)
    var darker = Math.min(firstLuminance, secondLuminance)
    return (lighter + 0.05) / (darker + 0.05)
  }

  function contrastGuard(candidate, fallback, minimum) {
    return contrastRatio(candidate, artContrastSurface) >= minimum ? candidate : fallback
  }

  Behavior on renderScale { NumberAnimation { duration: 280; easing.type: Easing.OutCubic } }
  Behavior on cyan { ColorAnimation { duration: 220 } }
  Behavior on ivory { ColorAnimation { duration: 220 } }
  Behavior on muted { ColorAnimation { duration: 220 } }
  Behavior on brass { ColorAnimation { duration: 220 } }
  Behavior on fault { ColorAnimation { duration: 220 } }
  Behavior on graphite { ColorAnimation { duration: 220 } }
  Behavior on panelBorder { ColorAnimation { duration: 220 } }
  Behavior on artPrimary { ColorAnimation { duration: 220 } }
  Behavior on artSecondary { ColorAnimation { duration: 220 } }
  Behavior on artFault { ColorAnimation { duration: 220 } }

  Timer {
    id: revealStart
    interval: 32
    repeat: false
    onTriggered: panelReveal.restart()
  }

  Timer {
    id: contentRevealStart
    interval: 160
    repeat: false
    onTriggered: contentReveal.restart()
  }

  ParallelAnimation {
    id: contentReveal
    NumberAnimation {
      target: root
      property: "contentOpacity"
      from: 0
      to: 1
      duration: 420
      easing.type: Easing.InOutCubic
    }
    NumberAnimation {
      target: root
      property: "contentOffset"
      from: 12
      to: 0
      duration: 420
      easing.type: Easing.InOutCubic
    }
  }

  ParallelAnimation {
    id: panelReveal
    NumberAnimation { target: root; property: "revealOpacity"; from: 0; to: 1; duration: 280; easing.type: Easing.OutCubic }
    NumberAnimation { target: root; property: "revealOffset"; from: 16; to: 0; duration: 280; easing.type: Easing.OutCubic }
  }

  SequentialAnimation {
    id: readingFade
    NumberAnimation { target: root; property: "readingOpacity"; to: 0; duration: 0 }
    PauseAnimation { duration: 32 }
    NumberAnimation { target: root; property: "readingOpacity"; to: 1; duration: 240; easing.type: Easing.OutCubic }
  }

  Timer {
    id: readingRevealDelay
    interval: 420
    repeat: false
    onTriggered: {
      cardsComplete = true
      readingFade.restart()
    }
  }

  NumberAnimation {
    id: inspectionRevealAnimation
    target: root
    property: "inspectionProgress"
    from: 0
    to: 1
    duration: 280
    easing.type: Easing.OutCubic
  }

  SequentialAnimation {
    id: inspectionCloseAnimation
    NumberAnimation { target: root; property: "inspectionProgress"; to: 0; duration: 180; easing.type: Easing.InCubic }
    ScriptAction { script: root.finishCloseInspection() }
  }

  function cardRevealed(index) {
    return revealedCards[String(index)] === true
  }

  function allCardsRevealed() {
    if (!reading || !reading.cards || reading.cards.length === 0) return false
    for (var i = 0; i < reading.cards.length; i++)
      if (!cardRevealed(i)) return false
    return true
  }

  function revealAllCards() {
    readingRevealDelay.stop()
    var next = ({})
    if (reading && reading.cards)
      for (var i = 0; i < reading.cards.length; i++) next[String(i)] = true
    revealedCards = next
    cardsComplete = true
    readingOpacity = 1
  }

  function veilCards() {
    readingRevealDelay.stop()
    revealedCards = ({})
    cardsComplete = false
    readingOpacity = 0
    Qt.callLater(function() {
      var first = cardRepeater.itemAt(0)
      if (first) first.forceActiveFocus()
    })
  }

  function revealCard(index) {
    if (cardRevealed(index)) return
    var next = ({})
    for (var key in revealedCards) next[key] = revealedCards[key]
    next[String(index)] = true
    revealedCards = next
    if (allCardsRevealed()) readingRevealDelay.restart()
    else Qt.callLater(function() {
      var following = cardRepeater.itemAt(index + 1)
      if (following) following.forceActiveFocus()
    })
  }

  function handleReadingRevision() {
    if (!opened) return
    if (veilNextReading) veilCards()
    else revealAllCards()
    veilNextReading = false
  }

  onReadingRevisionChanged: handleReadingRevision()

  function openInspection(itemData) {
    if (!itemData) return
    inspectionCloseAnimation.stop()
    inspectionRevealAnimation.stop()
    inspectionItem = itemData
    inspectionProgress = 0
    inspectionOpen = true
    inspectionRevealAnimation.restart()
    Qt.callLater(function() { inspectionLayer.forceActiveFocus() })
  }

  function closeInspection() {
    if (!inspectionOpen || inspectionCloseAnimation.running) return
    inspectionRevealAnimation.stop()
    inspectionCloseAnimation.restart()
  }

  function finishCloseInspection() {
    inspectionOpen = false
    inspectionItem = null
    inspectionProgress = 0
    Qt.callLater(function() { keyboardRoot.forceActiveFocus() })
  }

  function resolveService() {
    if (!service && shell && typeof shell.serviceFor === "function")
      service = shell.serviceFor("org.ministryoftaste.arcana")
    return service
  }

  function open(payloadJson) {
    panelReveal.stop()
    revealStart.stop()
    contentReveal.stop()
    contentRevealStart.stop()
    revealOpacity = 0
    revealOffset = 16
    contentOpacity = 0
    contentOffset = 12
    opened = true
    viewMode = "reading"
    pendingRedraw = ""
    resolveService()
    if (service && !service.currentReading) {
      veilNextReading = true
      if (!service.requestDaily(false)) veilNextReading = false
    } else revealAllCards()
    revealStart.restart()
    contentRevealStart.restart()
    Qt.callLater(function() { if (cardsComplete) keyboardRoot.forceActiveFocus() })
  }

  function close() {
    revealStart.stop()
    panelReveal.stop()
    contentRevealStart.stop()
    contentReveal.stop()
    readingRevealDelay.stop()
    inspectionRevealAnimation.stop()
    inspectionCloseAnimation.stop()
    inspectionOpen = false
    inspectionItem = null
    inspectionProgress = 0
    revealOpacity = 0
    revealOffset = 16
    contentOpacity = 0
    contentOffset = 12
    opened = false
    pendingRedraw = ""
    viewMode = "reading"
  }

  function requestClose() {
    if (shell && typeof shell.hide === "function")
      shell.hide("org.ministryoftaste.arcana")
    else close()
  }

  function showDaily() {
    viewMode = "reading"
    pendingRedraw = ""
    veilNextReading = false
    if (resolveService()) service.requestDaily(false)
  }

  function drawFree() {
    viewMode = "reading"
    pendingRedraw = ""
    veilNextReading = true
    veilCards()
    if (!resolveService() || !service.requestFree()) {
      veilNextReading = false
      revealAllCards()
    }
  }

  function drawSpread() {
    viewMode = "reading"
    pendingRedraw = ""
    veilNextReading = true
    veilCards()
    if (!resolveService() || !service.requestSpread()) {
      veilNextReading = false
      revealAllCards()
    }
  }

  function confirmDailyRedraw() {
    if (pendingRedraw === "daily") {
      pendingRedraw = ""
      veilNextReading = true
      veilCards()
      if (!resolveService() || !service.requestDaily(true)) {
        veilNextReading = false
        revealAllCards()
      }
    } else pendingRedraw = "daily"
  }

  function openAgentPreview() {
    if (!cardsComplete) return
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

  function questionStateText() {
    readingRevision
    if (!reading || reading.originalQuestion === null) return ""
    var text = "Question · “" + reading.originalQuestion + "”"
    if (reading.normalizedQuestion !== reading.originalQuestion)
      text += "\nReframed · " + reading.normalizedQuestion + "\nReason · " + reading.reframeReason
    return text
  }

  function narrativeText() {
    readingRevision
    if (!reading) return "Drawing from the complete 78-card system…"
    var utterances = expandedReading ? reading.utterances.expanded : reading.utterances.concise
    var lines = utterances.map(function(item) { return item.text })
    return lines.join(expandedReading ? "\n\n" : "\n")
  }

  function modeLabel() {
    if (!service) return "Preparing"
    if (service.currentReadingKind === "spread") return "Context · Friction · Doorway"
    if (service.currentReadingKind === "free") return "Free draw"
    return "Daily draw"
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

    WlrLayershell.namespace: "arcana"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: root.opened ? WlrKeyboardFocus.Exclusive : WlrKeyboardFocus.None

    anchors {
      top: true
      bottom: true
      left: true
      right: true
    }

    mask: Region {
      x: root.inspectionOpen ? 0 : frameBounds.x
      y: root.inspectionOpen ? 0 : frameBounds.y
      width: root.inspectionOpen ? surface.width : frameBounds.width
      height: root.inspectionOpen ? surface.height : frameBounds.height
    }

    FocusScope {
      id: keyboardRoot
      anchors.fill: parent
      focus: true

      Keys.onPressed: function(event) {
        if (root.inspectionOpen) {
          if (event.key === Qt.Key_Escape || event.key === Qt.Key_Q || event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space)
            root.closeInspection()
          event.accepted = true
          return
        }
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
        } else if (event.key === Qt.Key_C) {
          if (root.resolveService()) root.service.copyCurrentReading(); event.accepted = true
        } else if (event.key === Qt.Key_E) {
          root.expandedReading = !root.expandedReading; event.accepted = true
        } else if (event.key === Qt.Key_I) {
          root.viewMode = "about"; event.accepted = true
        } else if (event.key === Qt.Key_1) {
          if (root.resolveService()) root.service.setUiScale(1); event.accepted = true
        } else if (event.key === Qt.Key_2) {
          if (root.resolveService()) root.service.setUiScale(1.25); event.accepted = true
        } else if (event.key === Qt.Key_3) {
          if (root.resolveService()) root.service.setUiScale(1.5); event.accepted = true
        } else if (event.key === Qt.Key_T) {
          if (root.resolveService()) root.service.toggleThemeMode(); event.accepted = true
        } else if (event.key === Qt.Key_R && root.viewMode === "reading" && root.service && root.service.currentReadingKind === "daily") {
          root.confirmDailyRedraw(); event.accepted = true
        } else if (event.key === Qt.Key_Slash && root.viewMode === "agent") {
          questionInput.forceActiveFocus(); event.accepted = true
        }
      }

      Item {
        id: frameBounds
        anchors.centerIn: parent
        anchors.verticalCenterOffset: root.revealOffset
        width: root.baseWidth * root.renderScale
        height: root.baseHeight * root.renderScale
        opacity: root.revealOpacity

        Rectangle {
          id: frame
          width: root.baseWidth
          height: root.baseHeight
          transformOrigin: Item.TopLeft
          scale: root.renderScale
          radius: 8
          color: root.graphite
          border.width: 1
          border.color: root.panelBorder

        Rectangle {
          id: innerKeyline
          anchors.fill: parent
          anchors.margins: 2
          radius: 6
          color: "transparent"
          border.width: 1
          border.color: Qt.rgba(root.ivory.r, root.ivory.g, root.ivory.b, 0.055)
        }

        Column {
          id: interfaceContent
          anchors.fill: parent
          anchors.margins: 24
          spacing: 0
          opacity: root.contentOpacity
          transform: Translate { y: root.contentOffset }

          Item {
            width: parent.width
            height: 58

            Item {
              x: 0
              y: 4
              width: 46
              height: 38
              Rectangle { anchors.centerIn: parent; width: 20; height: 20; rotation: 45; color: "transparent"; border.width: 1; border.color: root.cyan }
              Rectangle {
                id: registrationLine
                anchors.verticalCenter: parent.verticalCenter
                width: root.viewMode === "reading" ? 42 : (root.viewMode === "agent" ? 32 : 37)
                height: 1
                color: root.cyan
                opacity: 0.72
                Behavior on width { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }
              }
              Rectangle { anchors.centerIn: parent; width: 4; height: 4; radius: 2; color: root.cyan }
              Rectangle {
                x: registrationLine.width - 4
                y: 30
                width: 4
                height: 4
                radius: 2
                color: root.brass
                Behavior on x { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }
              }
            }

            Text {
              x: 58
              anchors.verticalCenter: parent.verticalCenter
              text: "ARCANA"
              color: root.ivory
              font.family: "monospace"
              font.pixelSize: 19
              font.bold: true
              font.letterSpacing: 2.5
              textFormat: Text.PlainText
            }

            Text {
              anchors.right: closeButton.left
              anchors.rightMargin: 18
              anchors.verticalCenter: parent.verticalCenter
              text: root.modeLabel()
              color: root.cyan
              font.family: "monospace"
              font.pixelSize: 9
              font.letterSpacing: 1.1
              textFormat: Text.PlainText
            }

            ArcanaButton { systemTheme: root.systemTheme;
              id: closeButton
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              text: "Esc  Close"
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
              ArcanaButton { systemTheme: root.systemTheme; text: "D  Daily"; compact: true; selected: root.viewMode === "reading" && root.service && root.service.currentReadingKind === "daily"; onClicked: root.showDaily() }
              ArcanaButton { systemTheme: root.systemTheme; text: "F  Free"; compact: true; selected: root.viewMode === "reading" && root.service && root.service.currentReadingKind === "free"; onClicked: root.drawFree() }
              ArcanaButton { systemTheme: root.systemTheme; text: "S  Spread"; compact: true; selected: root.viewMode === "reading" && root.service && root.service.currentReadingKind === "spread"; onClicked: root.drawSpread() }
              ArcanaButton { systemTheme: root.systemTheme; text: "A  Agent"; compact: true; selected: root.viewMode === "agent"; onClicked: root.openAgentPreview() }
              ArcanaButton { systemTheme: root.systemTheme; text: "I  About"; compact: true; selected: root.viewMode === "about"; onClicked: root.viewMode = "about" }
            }

            Text {
              visible: root.pendingRedraw === "daily"
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              text: "Press R again to replace today’s card"
              color: root.brass
              font.family: "monospace"
              font.pixelSize: 9
              font.letterSpacing: 0.8
              textFormat: Text.PlainText
            }

            Row {
              visible: root.pendingRedraw !== "daily"
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              spacing: 5
              Text { anchors.verticalCenter: parent.verticalCenter; text: "Scale"; color: root.muted; font.family: "monospace"; font.pixelSize: 9; font.letterSpacing: 1; textFormat: Text.PlainText }
              ArcanaButton { systemTheme: root.systemTheme; text: "1×"; compact: true; selected: root.selectedScale === 1; onClicked: { if (root.resolveService()) root.service.setUiScale(1) } }
              ArcanaButton { systemTheme: root.systemTheme; text: "1.25×"; compact: true; selected: root.selectedScale === 1.25; onClicked: { if (root.resolveService()) root.service.setUiScale(1.25) } }
              ArcanaButton { systemTheme: root.systemTheme; text: "1.5×"; compact: true; selected: root.selectedScale === 1.5; onClicked: { if (root.resolveService()) root.service.setUiScale(1.5) } }
              ArcanaButton { systemTheme: root.systemTheme; text: root.systemTheme ? "Colors  System" : "Colors  Arcana"; compact: true; selected: root.systemTheme; onClicked: { if (root.resolveService()) root.service.toggleThemeMode() } }
            }
          }

          Rectangle { width: parent.width; height: 1; color: "#273638" }

          Item {
            id: content
            width: parent.width
            height: frame.height - 24*2 - 58 - 48 - 2

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

                  ArcanaCard {
                    visible: !root.reading
                    anchors.centerIn: parent
                    width: 220
                    height: 385
                    showBack: true
                    backgroundColor: root.graphite
                    frameColor: root.panelBorder
                    artFrameColor: root.panelBorder
                    inkColor: root.ivory
                    mutedColor: root.muted
                    primaryColor: root.artPrimary
                    secondaryColor: root.artSecondary
                    faultColor: root.artFault
                    opacity: 0.74
                  }

                  Row {
                    visible: !!root.reading
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.top: parent.top
                    anchors.topMargin: 10
                    spacing: root.reading && root.reading.cards.length === 3 ? 12 : 0

                    Repeater {
                      id: cardRepeater
                      model: root.reading ? root.reading.cards : []
                      delegate: CardFace {
                        required property var modelData
                        required property int index
                        itemData: modelData
                        cardWidth: root.reading && root.reading.cards.length === 3 ? 178 : 228
                        revealed: root.cardRevealed(index)
                        artPrimary: root.artPrimary
                        artSecondary: root.artSecondary
                        artFault: root.artFault
                        onRevealRequested: root.revealCard(index)
                        onInspectRequested: root.openInspection(modelData)
                      }
                    }
                  }
                }

                Rectangle { width: 1; height: parent.height; color: "#2d3d40" }

                Item {
                  width: parent.width - cardsPane.width - 21
                  height: parent.height

                  Column {
                    visible: root.reading && !root.cardsComplete
                    anchors.centerIn: parent
                    width: parent.width - 48
                    spacing: 12

                    Text {
                      width: parent.width
                      text: root.reading && root.reading.cards.length > 1 ? "Reveal all three cards" : "Reveal the card"
                      color: root.cyan
                      font.family: "monospace"
                      font.pixelSize: 14
                      font.bold: true
                      font.letterSpacing: 1.8
                      horizontalAlignment: Text.AlignHCenter
                      textFormat: Text.PlainText
                    }
                    Text {
                      width: parent.width
                      text: root.reading && root.reading.cards.length > 1
                        ? "Each position opens independently. The reading appears when the spread is complete."
                        : "Lift the card with focus or hover, then click or press Enter to turn it."
                      color: root.muted
                      font.family: "monospace"
                      font.pixelSize: 11
                      lineHeight: 1.4
                      wrapMode: Text.Wrap
                      horizontalAlignment: Text.AlignHCenter
                      textFormat: Text.PlainText
                    }
                  }

                  Flickable {
                    id: readingScroll
                    visible: root.cardsComplete
                    opacity: root.readingOpacity
                    anchors.fill: parent
                    contentWidth: width
                    contentHeight: summaryColumn.implicitHeight
                    clip: true
                    boundsBehavior: Flickable.StopAtBounds

                    Column {
                      id: summaryColumn
                      width: readingScroll.width - 14
                      spacing: 11

                    Text { width: parent.width; text: root.reading ? (root.reading.cards.length === 1 ? root.modeLabel()+"  ·  "+root.reading.cards[0].card.title : root.reading.spreadName) : "Preparing draw"; color: root.cyan; font.family: "sans-serif"; font.pixelSize: 15; font.bold: true; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.originalQuestion !== null; width: parent.width; text: root.questionStateText(); color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; lineHeight: 1.35; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { width: parent.width; text: root.narrativeText(); color: root.ivory; font.family: "sans-serif"; font.pixelSize: 14; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Rectangle { width: parent.width; height: 1; color: "#334447" }
                    Text { visible: root.reading && root.reading.relationships.length > 0; width: parent.width; text: "Relationships"; color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; font.bold: true; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.relationships.length > 0; width: parent.width; text: root.relationshipText(); color: root.muted; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.patterns.length > 0; width: parent.width; text: "Spread pattern"; color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; font.bold: true; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.patterns.length > 0; width: parent.width; text: root.patternText(); color: root.muted; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Rectangle { visible: root.reading && (root.reading.patterns.length > 0 || root.reading.alternative !== null); width: parent.width; height: 1; color: "#334447" }
                    Text { visible: root.reading && root.reading.alternative !== null; width: parent.width; text: "Another supported reading"; color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; font.bold: true; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.alternative !== null; width: parent.width; text: root.reading && root.reading.alternative ? root.reading.alternative.text : ""; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { visible: root.reading && root.reading.distinguishingQuestions.length > 0; width: parent.width; text: "Distinguishing question\n" + (root.reading ? root.reading.distinguishingQuestions.join("\n") : ""); color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; font.bold: true; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { width: parent.width; text: root.reading ? root.reading.reflection : ""; color: root.cyan; font.family: "sans-serif"; font.pixelSize: 13; font.italic: true; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Row {
                      spacing: 8
                      ArcanaButton { systemTheme: root.systemTheme; text: root.expandedReading ? "E  Compact" : "E  Expand"; onClicked: root.expandedReading = !root.expandedReading }
                      ArcanaButton { systemTheme: root.systemTheme; text: root.service && root.service.copyStatus === "copied" ? "C  Copied" : "C  Copy"; onClicked: { if (root.resolveService()) root.service.copyCurrentReading() } }
                      ArcanaButton { systemTheme: root.systemTheme; visible: root.service && root.service.currentReadingKind === "daily"; text: root.pendingRedraw === "daily" ? "R  Confirm redraw" : "R  Redraw daily"; danger: root.pendingRedraw === "daily"; onClicked: root.confirmDailyRedraw() }
                    }
                    }
                  }

                  Rectangle {
                    visible: root.cardsComplete && readingScroll.contentHeight > readingScroll.height + 2 && !readingScroll.atYEnd
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.bottom: parent.bottom
                    height: 42
                    gradient: Gradient {
                      GradientStop { position: 0.0; color: "#00101416" }
                      GradientStop { position: 0.62; color: "#dc101416" }
                      GradientStop { position: 1.0; color: "#ff101416" }
                    }
                  }

                  Text {
                    visible: root.cardsComplete && readingScroll.contentHeight > readingScroll.height + 2 && !readingScroll.atYEnd
                    anchors.right: parent.right
                    anchors.rightMargin: 12
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 7
                    text: "Scroll  ↓"
                    color: root.cyan
                    font.family: "monospace"
                    font.pixelSize: 9
                    font.bold: true
                    font.letterSpacing: 1
                    textFormat: Text.PlainText
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

                Text { text: "Ask your agent"; color: root.cyan; font.family: "monospace"; font.pixelSize: 14; font.bold: true; font.letterSpacing: 1.8; textFormat: Text.PlainText }
                Text { width: parent.width; text: "Check what will be shared before opening the agent terminal. Nothing is sent until you choose Launch."; color: root.brass; font.family: "sans-serif"; font.pixelSize: 12; wrapMode: Text.Wrap; textFormat: Text.PlainText }

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
                  ArcanaButton { systemTheme: root.systemTheme; id: actionButton; text: "Update preview"; onClicked: root.openAgentPreview() }
                }

                Text { width: parent.width; text: root.agentStatusText(); color: root.service && root.service.agentStatus === "launch-failed" ? root.fault : root.muted; font.family: "monospace"; font.pixelSize: 10; textFormat: Text.PlainText }

                Rectangle {
                  width: parent.width
                  height: Math.max(120, parent.height - y - agentActions.height - parent.spacing - 18)
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
                  id: agentActions
                  height: 38
                  spacing: 10
                  ArcanaButton { systemTheme: root.systemTheme; visible: root.service && (root.service.agentStatus === "unset" || root.service.agentStatus === "retry"); text: root.service && root.service.agentStatus === "retry" ? "Recheck agent" : "Choose default agent"; onClicked: { if (root.service.agentStatus === "retry") root.openAgentPreview(); else root.service.openAgentPicker() } }
                  ArcanaButton { systemTheme: root.systemTheme; visible: root.service && root.service.agentStatus === "ready"; text: "Launch " + (root.service ? root.service.configuredAgent : "agent"); onClicked: root.service.launchAgent() }
                  ArcanaButton { systemTheme: root.systemTheme; text: "Back to reading"; onClicked: { root.viewMode = "reading"; keyboardRoot.forceActiveFocus() } }
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
                  Text { text: "How a reading is made"; color: root.cyan; font.family: "sans-serif"; font.pixelSize: 15; font.bold: true; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Arcana brings together the card’s meaning, its orientation, its place in the spread, and the connections between the cards."; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 13; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "The same cards and choices always produce the same reading. A second interpretation appears only when the cards genuinely support one."; color: root.muted; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                }

                Rectangle { width: 1; height: parent.height; color: "#334447" }

                Column {
                  width: parent.width - Math.round(parent.width * 0.47) - 31
                  spacing: 14
                  Text { text: "Ground rules"; color: root.brass; font.family: "sans-serif"; font.pixelSize: 15; font.bold: true; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Use the reading to notice patterns and ask better questions—not to surrender a decision."; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 13; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Arcana does not predict outcomes, diagnose people, read someone else’s mind, or replace medical, legal, financial, or human support."; color: root.muted; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                  ArcanaButton { systemTheme: root.systemTheme; text: "Back to reading"; onClicked: { root.viewMode = "reading"; keyboardRoot.forceActiveFocus() } }
                }
              }
            }
          }

        }
      }

      FocusScope {
        id: inspectionLayer
        anchors.fill: parent
        visible: root.inspectionOpen
        focus: root.inspectionOpen
        z: 100

        Keys.onPressed: function(event) {
          if (event.key === Qt.Key_Escape || event.key === Qt.Key_Q || event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space)
            root.closeInspection()
          event.accepted = true
        }

        Rectangle {
          anchors.fill: parent
          color: Qt.rgba(0, 0, 0, 0.88 * root.inspectionProgress)
        }

        MouseArea {
          anchors.fill: parent
          cursorShape: Qt.PointingHandCursor
          onClicked: root.closeInspection()
        }

        Column {
          id: inspectionContent
          anchors.centerIn: parent
          width: root.inspectionWidth
          spacing: 8
          opacity: root.inspectionProgress
          scale: 0.84 + (0.16 * root.inspectionProgress)
          transformOrigin: Item.Center

          Text {
            width: parent.width
            text: "Card inspection  ·  " + (root.inspectionItem ? root.inspectionItem.card.title : "")
            color: root.cyan
            font.family: "monospace"
            font.pixelSize: 10
            font.bold: true
            font.letterSpacing: 1.2
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            textFormat: Text.PlainText
          }

          Rectangle {
            id: inspectionCard
            width: parent.width
            height: Math.round(width * 1.75)
            radius: 7
            color: "#101416"
            border.width: 2
            border.color: root.inspectionItem && root.inspectionItem.orientation === "reversed" ? root.brass : root.cyan

            Rectangle {
              x: 10
              y: 14
              width: parent.width
              height: parent.height
              z: -1
              radius: 9
              color: "#a6000000"
            }

            ArcanaCard {
              anchors.fill: parent
              anchors.margins: 4
              cardData: root.inspectionItem ? root.inspectionItem.card : null
              showBack: false
              reversed: root.inspectionItem && root.inspectionItem.orientation === "reversed"
              backgroundColor: "#07090b"
              frameColor: "#273139"
              artFrameColor: "#36434b"
              inkColor: "#e4e0d6"
              mutedColor: "#899a9c"
              primaryColor: root.artPrimary
              secondaryColor: root.artSecondary
              faultColor: root.artFault
            }

            MouseArea {
              anchors.fill: parent
              cursorShape: Qt.PointingHandCursor
              onClicked: root.closeInspection()
            }
          }

          Text {
            width: parent.width
            text: root.inspectionItem ? root.inspectionItem.card.systemTitle + "  ·  " + root.inspectionItem.orientationLabel : ""
            color: root.brass
            font.family: "monospace"
            font.pixelSize: 10
            font.bold: true
            font.letterSpacing: 0.8
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            textFormat: Text.PlainText
          }

          Text {
            width: parent.width
            text: "Click, Enter, or Esc to return"
            color: root.muted
            font.family: "monospace"
            font.pixelSize: 9
            font.letterSpacing: 1.1
            horizontalAlignment: Text.AlignHCenter
            textFormat: Text.PlainText
          }
        }
      }
    }
  }
}
}
