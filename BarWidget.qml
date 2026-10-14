import QtQuick
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "org.ministryoftaste.arcana"

  readonly property var arcana: root.bar && root.bar.shell
    ? root.bar.shell.serviceFor(root.moduleName)
    : null
  readonly property var reading: arcana ? arcana.currentReading : null
  readonly property string summary: {
    if (!reading || !reading.cards || !reading.cards.length) return ""
    var kind = reading.kind === "spread" ? "Spread" : reading.kind === "free" ? "Free" : "Daily"
    var titles = reading.cards.map(function(item) {
      return item.card.title + (item.orientation === "reversed" ? " (reversed)" : "")
    })
    return kind + " · " + titles.join(" / ")
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  // A font glyph through BarIconButton, like the stock widgets, so the icon
  // takes the bar's own size, optical centering, and foreground color.
  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "\uDB81\uDE38" // nf-md-cards (U+F0638)
    fontFamily: "JetBrainsMono Nerd Font"
    tooltipText: root.summary !== "" ? "Arcana · " + root.summary : "Arcana"

    onPressed: function(mouseButton) {
      if (mouseButton === Qt.LeftButton && root.bar)
        root.bar.run("omarchy-shell shell toggle org.ministryoftaste.arcana '{}'")
      else if (mouseButton === Qt.MiddleButton && root.arcana)
        root.arcana.requestFree()
    }
  }
}
