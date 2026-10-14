import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Wayland
import Quickshell.Hyprland
import qs.Commons
import "components"
import "src/Settings.js" as Settings

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
  // Output the panel opens on; chosen from Hyprland's focused monitor at open.
  property var targetScreen: Quickshell.screens.length > 0 ? Quickshell.screens[0] : null
  readonly property var reading: service ? service.currentReading : null
  readonly property int readingRevision: service ? service.readingRevision : 0
  readonly property bool systemTheme: service && service.themeMode === "system"
  readonly property string statusMessage: !service ? "Arcana service unavailable. Reload the plugin."
    : service.dataStatus === "invalid" ? "Deck files could not be loaded. Reinstall Arcana; your saved state is preserved."
    : service.stateStatus === "invalid" ? "Saved state is invalid. Back up and repair the state file, then retry. See README → Recovery."
    : service.stateStatus === "load-failed" ? "Saved state could not be read. Check file permissions, then retry."
    : service.stateStatus === "save-failed" ? "Changes are not saved. Check storage space and permissions, then retry saving."
    : service.drawStatus === "entropy-failed" ? "Randomness unavailable. Previous reading preserved; try Daily, Free, or Spread again."
    : service.drawStatus === "interpretation-failed" ? "This draw could not be interpreted. Previous reading preserved; try drawing again."
    : !service.ready ? "Loading Arcana…" : ""

  Connections {
    target: root.service
    function onDrawStatusChanged() {
      if (root.service.drawStatus === "entropy-failed" || root.service.drawStatus === "interpretation-failed") {
        root.veilNextReading = false
        root.revealAllCards()
      }
    }
    function onReadyChanged() {
      if (root.opened && root.service.ready && !root.reading) root.showDaily()
    }
  }
  property color cyan: systemTheme ? Color.accent : "#62d6df"
  property color ivory: systemTheme ? Color.popups.text : "#e4e0d6"
  property color muted: systemTheme ? readableSystemText(Color.muted) : "#899a9c"
  property color brass: systemTheme ? readableSystemText(Color.popups.border) : "#b89b61"
  property color fault: systemTheme ? readableSystemText(Color.urgent) : "#d97743"
  property color graphite: systemTheme ? Color.popups.background : "#101416"
  property color panelBorder: systemTheme ? Color.popups.border : "#3e5558"
  property color artContrastSurface: "#10151a"
  property color divider: systemTheme ? Qt.rgba(Color.popups.border.r, Color.popups.border.g, Color.popups.border.b, 0.7) : "#334447"
  property color dividerQuiet: systemTheme ? Qt.rgba(Color.popups.border.r, Color.popups.border.g, Color.popups.border.b, 0.5) : "#273638"
  property color insetSurface: systemTheme ? Qt.darker(Color.popups.background, 1.15) : "#0c1012"
  property color insetText: systemTheme ? Color.popups.text : "#b7c0be"
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
  readonly property bool fullscreen: service && service.fullscreen
  readonly property var panelLayout: Settings.panelLayout(surface.width, surface.height, selectedScale, fullscreen)
  readonly property real effectiveScale: panelLayout.scale
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

  function readableSystemText(candidate) {
    var background = Color.popups.background
    if (contrastRatio(candidate, background) >= 4.5) return candidate
    if (contrastRatio(Color.popups.text, background) >= 4.5) return Color.popups.text
    var white = Qt.rgba(1, 1, 1, 1)
    var black = Qt.rgba(0, 0, 0, 1)
    return contrastRatio(white, background) >= contrastRatio(black, background) ? white : black
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
  Behavior on divider { ColorAnimation { duration: 220 } }

  // An armed daily redraw disarms itself if it is not confirmed.
  Timer {
    id: redrawArmTimeout
    interval: 4000
    running: root.pendingRedraw !== ""
    onTriggered: root.pendingRedraw = ""
  }

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

  function focusedScreen() {
    var monitor = Hyprland.focusedMonitor
    if (monitor)
      for (var i = 0; i < Quickshell.screens.length; i++)
        if (Quickshell.screens[i].name === monitor.name) return Quickshell.screens[i]
    return Quickshell.screens.length > 0 ? Quickshell.screens[0] : null
  }

  function open(payloadJson) {
    targetScreen = focusedScreen()
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
    question = reading && reading.originalQuestion ? reading.originalQuestion : ""
    questionInput.focus = false
    // Draw a fresh daily when there is no reading yet, or when the reading on
    // screen is a daily card from an earlier day.
    if (service && (!service.currentReading || service.dailyIsStale())) {
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

  function narrativeItems() {
    readingRevision
    if (!reading) return []
    var utterances = expandedReading ? reading.utterances.expanded : reading.utterances.concise
    // Reflection prompts and the alternative have their own sections.
    return utterances.filter(function(item) { return item.role !== "reflection" && item.role !== "alternative" })
  }

  function scrollActiveView(event) {
    var view = viewMode === "agent" ? packetScroll : viewMode === "history" ? historyList : viewMode === "reading" ? readingScroll : null
    if (!view) return false
    var page = Math.max(40, view.height - 40)
    var maxY = Math.max(0, view.contentHeight - view.height)
    var y = view.contentY
    if (event.key === Qt.Key_Down) y += 40
    else if (event.key === Qt.Key_Up) y -= 40
    else if (event.key === Qt.Key_PageDown) y += page
    else if (event.key === Qt.Key_PageUp) y -= page
    else if (event.key === Qt.Key_Home) y = 0
    else if (event.key === Qt.Key_End) y = maxY
    else return false
    view.contentY = Math.max(0, Math.min(maxY, y))
    return true
  }

  function showHistory() {
    pendingRedraw = ""
    viewMode = "history"
    Qt.callLater(function() { historyList.forceActiveFocus() })
  }

  function openHistoryEntry(index) {
    if (!resolveService() || !service.restoreHistory(index)) return
    viewMode = "reading"
    keyboardRoot.forceActiveFocus()
  }

  function historyText(entry) {
    if (!entry) return ""
    var kind = entry.kind === "daily" ? "Daily" : entry.kind === "free" ? "Free" : "Spread"
    var when = entry.createdAt ? Qt.formatDateTime(new Date(entry.createdAt), "yyyy-MM-dd  hh:mm") : ""
    var titles = (entry.cards || []).map(function(card) {
      return service.cardTitle(card.cardId) + (card.orientation === "reversed" ? " (reversed)" : "")
    })
    return { kind: kind, when: when, cards: titles.join("  ·  ") }
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


  function modeLabel() {
    if (!service) return "Preparing"
    if (service.currentReadingKind === "spread") return "Context · Friction · Doorway"
    if (service.currentReadingKind === "free") return "Free draw"
    return "Daily draw"
  }

  function agentStatusText() {
    if (!service) return "Service unavailable"
    var s=service.agentStatus
    if (s === "question-failed") return "This question could not be prepared. Try rephrasing it as an open question about your own situation."
    if (s === "no-reading") return "Draw and reveal a reading before preparing an agent packet."
    if (s === "checking") return "Checking Omarchy’s configured default agent…"
    if (s === "unset") return "No default agent is configured on this Omarchy system."
    if (s === "ready") return "Ready to launch “"+service.configuredAgent+"” in the configured terminal."
    if (s === "retry") return "Agent picker opened. Choose an agent, then recheck."
    if (s === "launching") return "Requesting the configured Omarchy agent terminal…"
    if (s === "launched") return "Agent terminal opened. Canonical Arcana data remains unchanged."
    if (s === "launch-failed") return "The configured-agent launch failed. The reading remains local and unchanged."
    if (s === "unavailable") return "Omarchy’s default-agent route was unavailable."
    return "Preview the packet before launching an agent."
  }

  PanelWindow {
    id: surface
    screen: root.targetScreen
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
        if (event.key === Qt.Key_F11) {
          if (root.resolveService()) root.service.toggleFullscreen()
          event.accepted = true
          return
        }
        if (root.scrollActiveView(event)) {
          event.accepted = true
          return
        }
        if (questionInput.activeFocus) {
          if (event.key === Qt.Key_Escape) {
            questionInput.focus = false
            keyboardRoot.forceActiveFocus()
            event.accepted = true
          }
          return
        }
        if (event.key === Qt.Key_Escape || event.key === Qt.Key_Q) {
          if (root.viewMode !== "reading") { root.viewMode = "reading"; keyboardRoot.forceActiveFocus() }
          else if (event.key === Qt.Key_Escape && root.fullscreen) root.service.setFullscreen(false)
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
          if (root.resolveService()) root.service.copyCurrentReading(event.modifiers & Qt.ShiftModifier ? "evidence" : "readable")
          event.accepted = true
        } else if (event.key === Qt.Key_H) {
          if (root.viewMode === "history") { root.viewMode = "reading"; keyboardRoot.forceActiveFocus() }
          else root.showHistory()
          event.accepted = true
        } else if (event.key === Qt.Key_V) {
          if (root.resolveService()) root.service.toggleReversals(); event.accepted = true
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

      MouseArea {
        id: outsideClick
        anchors.fill: parent
        acceptedButtons: Qt.LeftButton | Qt.RightButton | Qt.MiddleButton
        enabled: root.opened && !root.inspectionOpen && !root.fullscreen
        onClicked: root.requestClose()
      }

      Item {
        id: frameBounds
        anchors.centerIn: parent
        anchors.verticalCenterOffset: root.fullscreen ? 0 : root.revealOffset
        width: root.fullscreen ? surface.width : root.baseWidth * root.renderScale
        height: root.fullscreen ? surface.height : root.baseHeight * root.renderScale
        opacity: root.revealOpacity

        Rectangle {
          id: frame
          width: root.fullscreen ? surface.width / root.renderScale : root.baseWidth
          height: root.fullscreen ? surface.height / root.renderScale : root.baseHeight
          transformOrigin: Item.TopLeft
          scale: root.renderScale
          radius: root.fullscreen ? 0 : 8
          color: root.graphite
          border.width: 1
          border.color: root.panelBorder

        // Swallow clicks on the frame so they don't reach the outside-click area.
        MouseArea {
          anchors.fill: parent
          acceptedButtons: Qt.LeftButton | Qt.RightButton | Qt.MiddleButton
        }

        Rectangle {
          id: innerKeyline
          anchors.fill: parent
          anchors.margins: 2
          radius: root.fullscreen ? 0 : 6
          color: "transparent"
          border.width: 1
          border.color: Qt.rgba(root.ivory.r, root.ivory.g, root.ivory.b, 0.055)
        }

        Column {
          id: interfaceContent
          readonly property var layout: Settings.workspaceLayout(frame.width, frame.height, root.fullscreen)
          anchors.centerIn: parent
          width: layout.width
          height: layout.height
          spacing: 0
          opacity: root.contentOpacity
          transform: Translate { y: root.contentOffset }

          Item {
            width: parent.width
            height: 58

            // Same glyph as the bar icon, so the panel and bar read as one mark.
            Text {
              x: 4
              anchors.verticalCenter: parent.verticalCenter
              width: 38
              horizontalAlignment: Text.AlignHCenter
              text: "\uDB81\uDE38" // nf-md-cards (U+F0638)
              color: root.cyan
              font.family: "JetBrainsMono Nerd Font"
              font.pixelSize: 26
              textFormat: Text.PlainText
            }

            Text {
              id: panelTitle
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
              id: versionLabel
              anchors.left: panelTitle.right
              anchors.leftMargin: 10
              anchors.baseline: panelTitle.baseline
              text: root.manifest && root.manifest.version ? "v" + root.manifest.version : ""
              color: root.muted
              font.family: "monospace"
              font.pixelSize: 10
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
              text: root.fullscreen ? "Close" : "Esc  Close"
              compact: true
              onClicked: root.requestClose()
            }
          }

          Rectangle { width: parent.width; height: 1; color: root.divider }

          Item {
            width: parent.width
            height: 48

            Row {
              anchors.left: parent.left
              anchors.verticalCenter: parent.verticalCenter
              spacing: 8
              ArcanaButton { systemTheme: root.systemTheme; text: "D  Daily"; compact: true; selected: root.viewMode === "reading" && !!root.service && root.service.currentReadingKind === "daily"; onClicked: root.showDaily() }
              ArcanaButton { systemTheme: root.systemTheme; text: "F  Free"; compact: true; selected: root.viewMode === "reading" && !!root.service && root.service.currentReadingKind === "free"; onClicked: root.drawFree() }
              ArcanaButton { systemTheme: root.systemTheme; text: "S  Spread"; compact: true; selected: root.viewMode === "reading" && !!root.service && root.service.currentReadingKind === "spread"; onClicked: root.drawSpread() }
              ArcanaButton { systemTheme: root.systemTheme; text: "A  Agent"; compact: true; selected: root.viewMode === "agent"; onClicked: root.openAgentPreview() }
              ArcanaButton { systemTheme: root.systemTheme; text: "H  History"; compact: true; selected: root.viewMode === "history"; onClicked: root.showHistory() }
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
              ArcanaButton { systemTheme: root.systemTheme; text: "Full"; compact: true; selected: root.fullscreen; Accessible.name: "Fullscreen (F11)"; onClicked: { if (root.resolveService()) root.service.toggleFullscreen() } }
              ArcanaButton { systemTheme: root.systemTheme; text: root.systemTheme ? "Colors  System" : "Colors  Arcana"; compact: true; selected: root.systemTheme; onClicked: { if (root.resolveService()) root.service.toggleThemeMode() } }
            }
          }

          Rectangle { width: parent.width; height: 1; color: root.dividerQuiet }

          RowLayout {
            id: statusBanner
            width: parent.width
            height: visible ? Math.max(44, statusText.implicitHeight + 12) : 0
            visible: root.statusMessage !== ""
            Text {
              id: statusText
              Layout.fillWidth: true
              text: root.statusMessage
              color: root.fault
              font.family: "sans-serif"
              font.pixelSize: 12
              wrapMode: Text.Wrap
              textFormat: Text.PlainText
            }
            ArcanaButton {
              systemTheme: root.systemTheme
              visible: !!root.service && ["invalid", "load-failed", "save-failed"].indexOf(root.service.stateStatus) >= 0
              text: root.service && root.service.stateStatus === "save-failed" ? "Retry saving" : "Retry loading"
              onClicked: root.service.retryStorage()
            }
          }

          Item {
            id: content
            width: parent.width
            height: interfaceContent.height - 58 - 48 - 2 - statusBanner.height

            Item {
              anchors.fill: parent
              visible: root.viewMode === "reading"

              Row {
                id: readingLayout
                readonly property var layout: Settings.readingLayout(parent.width, root.fullscreen, !!(root.reading && root.reading.cards && root.reading.cards.length === 3))
                anchors.horizontalCenter: parent.horizontalCenter
                y: 16
                width: layout.width
                height: parent.height - 26
                spacing: layout.gap

                Item {
                  id: cardsPane
                  width: readingLayout.layout.cardsWidth
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
                    id: cardStrip
                    visible: !!root.reading
                    anchors.horizontalCenter: parent.horizontalCenter
                    y: root.fullscreen ? 24 : 10
                    spacing: readingLayout.layout.cardGap

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

                Rectangle { width: 1; height: parent.height; color: root.dividerQuiet }

                Item {
                  width: readingLayout.layout.textWidth
                  height: parent.height

                  Column {
                    visible: !!root.reading && !root.cardsComplete
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

                    Item {
                      id: summaryColumn
                      width: readingScroll.width - 14
                      readonly property var layout: Settings.readingTextLayout(width, root.fullscreen)
                      implicitHeight: Math.max(detailsColumn.y + detailsColumn.implicitHeight, reflectionColumn.y + reflectionColumn.implicitHeight)

                    Column {
                      id: narrativeColumn
                      width: summaryColumn.layout.mainWidth
                      spacing: 11
                    Text { width: parent.width; text: root.reading ? (root.reading.cards.length === 1 ? root.modeLabel()+"  ·  "+root.reading.cards[0].card.title : root.reading.spreadName) : "Preparing draw"; color: root.cyan; font.family: "sans-serif"; font.pixelSize: 15; font.bold: true; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { visible: !!root.reading && root.reading.originalQuestion !== null; width: parent.width; text: root.questionStateText(); color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; lineHeight: 1.35; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { visible: !root.reading; width: parent.width; text: root.statusMessage || "Choose Daily, Free, or Spread to begin."; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 14; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Repeater {
                      model: root.narrativeItems()
                      delegate: Column {
                        required property var modelData
                        width: narrativeColumn.width
                        spacing: 3
                        Text { visible: modelData.label !== ""; width: parent.width; text: modelData.label; color: root.brass; font.family: "monospace"; font.pixelSize: 10; font.bold: true; font.letterSpacing: 0.9; elide: Text.ElideRight; textFormat: Text.PlainText }
                        Text { width: parent.width; text: modelData.text; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 14; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                      }
                    }
                    }

                    Rectangle {
                      visible: summaryColumn.layout.split
                      x: detailsColumn.x - 16
                      width: 1
                      height: detailsColumn.implicitHeight
                      color: root.divider
                    }
                    Column {
                      id: detailsColumn
                      x: summaryColumn.layout.split ? narrativeColumn.width + 32 : 0
                      y: summaryColumn.layout.split ? 0 : narrativeColumn.implicitHeight + 11
                      width: summaryColumn.layout.detailsWidth
                      spacing: 11
                    Rectangle { visible: !summaryColumn.layout.split; width: parent.width; height: 1; color: root.divider }
                    Text { visible: !!root.reading && root.reading.relationships.length > 0; width: parent.width; text: "Relationships"; color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; font.bold: true; textFormat: Text.PlainText }
                    Text { visible: !!root.reading && root.reading.relationships.length > 0; width: parent.width; text: root.relationshipText(); color: root.muted; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { visible: !!root.reading && root.reading.patterns.length > 0; width: parent.width; text: "Spread pattern"; color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; font.bold: true; textFormat: Text.PlainText }
                    Text { visible: !!root.reading && root.reading.patterns.length > 0; width: parent.width; text: root.patternText(); color: root.muted; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Rectangle { visible: !!root.reading && (root.reading.patterns.length > 0 || root.reading.alternative !== null); width: parent.width; height: 1; color: root.divider }
                    Text { visible: !!root.reading && root.reading.alternative !== null; width: parent.width; text: "Another supported reading"; color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; font.bold: true; textFormat: Text.PlainText }
                    Text { visible: !!root.reading && root.reading.alternative !== null; width: parent.width; text: root.reading && root.reading.alternative ? root.reading.alternative.text : ""; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Text { visible: !!root.reading && root.reading.distinguishingQuestions.length > 0; width: parent.width; text: "Distinguishing question\n" + (root.reading ? root.reading.distinguishingQuestions.join("\n") : ""); color: root.brass; font.family: "sans-serif"; font.pixelSize: 11; font.bold: true; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    }

                    Column {
                      id: reflectionColumn
                      y: summaryColumn.layout.split ? narrativeColumn.implicitHeight + 24 : detailsColumn.y + detailsColumn.implicitHeight + 11
                      width: summaryColumn.layout.mainWidth
                      spacing: 11
                    Rectangle { visible: summaryColumn.layout.split; width: parent.width; height: 1; color: root.divider }
                    Text { width: parent.width; text: root.reading ? root.reading.reflection : ""; color: root.cyan; font.family: "sans-serif"; font.pixelSize: 13; font.italic: true; lineHeight: 1.4; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                    Row {
                      spacing: 8
                      ArcanaButton { systemTheme: root.systemTheme; text: root.expandedReading ? "E  Compact" : "E  Expand"; onClicked: root.expandedReading = !root.expandedReading }
                      ArcanaButton { systemTheme: root.systemTheme; text: root.service && root.service.copyStatus === "copied" ? "C  Copied" : root.service && root.service.copyStatus === "copy-failed" ? "C  Retry copy" : "C  Copy"; onClicked: { if (root.resolveService()) root.service.copyCurrentReading("readable") } }
                      ArcanaButton { systemTheme: root.systemTheme; visible: !!root.service && root.service.currentReadingKind === "daily"; text: root.pendingRedraw === "daily" ? "R  Confirm redraw" : "R  Redraw daily"; danger: root.pendingRedraw === "daily"; onClicked: root.confirmDailyRedraw() }
                    }
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
                      GradientStop { position: 0.0; color: Qt.rgba(root.graphite.r, root.graphite.g, root.graphite.b, 0) }
                      GradientStop { position: 0.62; color: Qt.rgba(root.graphite.r, root.graphite.g, root.graphite.b, 0.86) }
                      GradientStop { position: 1.0; color: root.graphite }
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
                    color: root.systemTheme ? Qt.tint(root.graphite, Qt.rgba(root.ivory.r, root.ivory.g, root.ivory.b, 0.05)) : "#161c1e"
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
                      maximumLength: 1000
                      onTextChanged: root.question = text
                      Keys.onEscapePressed: function(event) { focus = false; keyboardRoot.forceActiveFocus(); event.accepted = true }
                      onAccepted: { focus = false; keyboardRoot.forceActiveFocus(); root.openAgentPreview() }
                    }
                    Text { anchors.fill: parent; anchors.margins: 10; visible: questionInput.text === "" && !questionInput.activeFocus; text: "/  optional question or intention"; color: root.muted; font.family: "monospace"; font.pixelSize: 11; textFormat: Text.PlainText }
                  }
                  ArcanaButton { systemTheme: root.systemTheme; id: actionButton; text: "Update preview"; onClicked: root.openAgentPreview() }
                }

                Text { width: parent.width; text: "Updating this preview saves your question with the last reading on this device—even if you do not launch an agent."; color: root.muted; font.family: "sans-serif"; font.pixelSize: 11; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                Text { width: parent.width; text: root.agentStatusText(); color: root.service && root.service.agentStatus === "launch-failed" ? root.fault : root.muted; font.family: "monospace"; font.pixelSize: 10; textFormat: Text.PlainText }

                Rectangle {
                  width: parent.width
                  height: Math.max(120, parent.height - y - agentActions.height - parent.spacing - 18)
                  color: root.insetSurface
                  border.width: 1
                  border.color: root.dividerQuiet
                  clip: true

                  Flickable {
                    id: packetScroll
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
                      color: root.insetText
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
                  ArcanaButton { systemTheme: root.systemTheme; visible: !!root.service && (root.service.agentStatus === "unset" || root.service.agentStatus === "retry"); text: root.service && root.service.agentStatus === "retry" ? "Recheck agent" : "Choose default agent"; onClicked: { if (root.service.agentStatus === "retry") root.openAgentPreview(); else root.service.openAgentPicker() } }
                  ArcanaButton { systemTheme: root.systemTheme; visible: !!root.service && root.service.agentStatus === "ready"; text: "Launch " + (root.service ? root.service.configuredAgent : "agent"); onClicked: root.service.launchAgent() }
                  ArcanaButton { systemTheme: root.systemTheme; text: "Back to reading"; onClicked: { root.viewMode = "reading"; keyboardRoot.forceActiveFocus() } }
                }
              }
            }

            Item {
              anchors.fill: parent
              visible: root.viewMode === "history"

              Column {
                anchors.fill: parent
                anchors.topMargin: 18
                anchors.bottomMargin: 12
                spacing: 12

                Text { text: "Recent readings"; color: root.cyan; font.family: "monospace"; font.pixelSize: 14; font.bold: true; font.letterSpacing: 1.8; textFormat: Text.PlainText }
                Text { width: parent.width; text: "The last " + 20 + " draws on this device. Only cards and orientations are kept, never questions. Enter or click reopens a reading."; color: root.muted; font.family: "sans-serif"; font.pixelSize: 11; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                Text { visible: !root.service || root.service.history.length === 0; text: "No readings yet."; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 13; textFormat: Text.PlainText }

                ListView {
                  id: historyList
                  width: parent.width
                  height: parent.height - y
                  clip: true
                  spacing: 4
                  boundsBehavior: Flickable.StopAtBounds
                  keyNavigationEnabled: true
                  model: root.service ? root.service.history : []
                  Keys.onReturnPressed: root.openHistoryEntry(currentIndex)
                  Keys.onEnterPressed: root.openHistoryEntry(currentIndex)
                  delegate: Rectangle {
                    required property var modelData
                    required property int index
                    readonly property var summary: root.historyText(modelData)
                    readonly property bool current: ListView.isCurrentItem && historyList.activeFocus
                    width: historyList.width
                    height: 40
                    radius: 3
                    color: current || rowMouse.containsMouse ? Qt.rgba(root.cyan.r, root.cyan.g, root.cyan.b, 0.09) : "transparent"
                    border.width: current ? 1 : 0
                    border.color: root.cyan
                    Row {
                      anchors.left: parent.left
                      anchors.leftMargin: 12
                      anchors.verticalCenter: parent.verticalCenter
                      spacing: 16
                      Text { width: 64; text: summary.kind; color: root.cyan; font.family: "monospace"; font.pixelSize: 10; font.bold: true; textFormat: Text.PlainText }
                      Text { width: 132; text: summary.when; color: root.muted; font.family: "monospace"; font.pixelSize: 10; textFormat: Text.PlainText }
                      Text { width: historyList.width - 260; text: summary.cards; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 12; elide: Text.ElideRight; textFormat: Text.PlainText }
                    }
                    MouseArea {
                      id: rowMouse
                      anchors.fill: parent
                      hoverEnabled: true
                      cursorShape: Qt.PointingHandCursor
                      onClicked: root.openHistoryEntry(index)
                    }
                  }
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

                Rectangle { width: 1; height: parent.height; color: root.divider }

                Column {
                  width: parent.width - Math.round(parent.width * 0.47) - 31
                  spacing: 14
                  Text { text: "Ground rules"; color: root.brass; font.family: "sans-serif"; font.pixelSize: 15; font.bold: true; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Use the reading to notice patterns and ask better questions—not to surrender a decision."; color: root.ivory; font.family: "sans-serif"; font.pixelSize: 13; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                  Text { width: parent.width; text: "Arcana does not predict outcomes, diagnose people, read someone else’s mind, or replace medical, legal, financial, or human support."; color: root.muted; font.family: "sans-serif"; font.pixelSize: 12; lineHeight: 1.45; wrapMode: Text.Wrap; textFormat: Text.PlainText }
                  ArcanaButton { systemTheme: root.systemTheme; text: root.service && root.service.reversals ? "V  Reversed cards: On" : "V  Reversed cards: Off"; selected: !!root.service && root.service.reversals; onClicked: { if (root.resolveService()) root.service.toggleReversals() } }
                  Text { width: parent.width; text: "Applies to new draws. Keys: ↑ ↓ PgUp PgDn scroll · Shift+C copies with evidence IDs."; color: root.muted; font.family: "sans-serif"; font.pixelSize: 11; wrapMode: Text.Wrap; textFormat: Text.PlainText }
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
