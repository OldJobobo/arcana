import QtQuick
import QtTest
import "../src/Interpretation.js" as Interpretation

TestCase {
  name: "SemanticProjection"

  function readJson(relativePath) {
    var request=new XMLHttpRequest()
    request.open("GET",Qt.resolvedUrl(relativePath),false)
    request.send()
    if (request.status !== 0 && request.status !== 200) throw new Error("Cannot read "+relativePath)
    return JSON.parse(request.responseText)
  }

  function test_node_equivalent_projection() {
    var catalog=readJson("../assets/semantic-v2/cards.json")
    var spreads=readJson("../assets/spreads.json")
    var semantic=Interpretation.interpret(catalog,spreads,{spreadId:"single",cards:[{positionId:"single",cardId:"major-00-the-fool",orientation:"reversed"}],originalQuestion:"Will I definitely succeed?",topicLens:"general",tradition:"rws",reversalPolicy:"multi_hypothesis",elementalDignity:"disabled",narratorId:"clear-reflective-v1"})
    var panel=Interpretation.toPanelReading(catalog,spreads,semantic,{kind:"free",createdAt:null})
    var packet=Interpretation.handoffPacket(Interpretation.buildHandoff(catalog,spreads,semantic))
    compare(semantic.id,"reading:83d71649")
    compare(semantic.normalizedQuestion,"What can I understand or do to improve my approach to this uncertain outcome?")
    compare(semantic.reframeReason,"prediction")
    compare(JSON.stringify(panel.cards[0].selectedHypotheses),JSON.stringify(["developing","excessive"]))
    verify(panel.alternative !== null)
    compare(panel.alternative.id,"proposition:alternative")
    compare(panel.distinguishingQuestions.length,1)
    compare(packet.semantic.readingId,semantic.id)
    compare(JSON.stringify(packet.cards[0].selectedHypotheses),JSON.stringify(panel.cards[0].selectedHypotheses))
    compare(JSON.stringify([packet.alternative.distinguishingQuestion]),JSON.stringify(panel.distinguishingQuestions))
    verify(packet.alternative !== null)
    compare(packet.alternative.id,panel.alternative.id)
    compare(packet.question.original,semantic.originalQuestion)
    compare(packet.question.normalized,semantic.normalizedQuestion)
    compare(packet.question.reframeReason,semantic.reframeReason)
  }

  function test_question_recomposition_precedes_all_runtime_projections() {
    var catalog=readJson("../assets/semantic-v2/cards.json")
    var spreads=readJson("../assets/spreads.json")
    var cards=[{positionId:"context",cardId:"major-16-the-tower",orientation:"reversed"},{positionId:"friction",cardId:"swords-01-ace",orientation:"upright"},{positionId:"doorway",cardId:"wands-01-ace",orientation:"upright"}]
    var base={spreadId:"context-friction-doorway",cards:cards,originalQuestion:null,topicLens:"general",tradition:"rws",reversalPolicy:"multi_hypothesis",elementalDignity:"disabled",narratorId:"clear-reflective-v1"}
    var questionless=Interpretation.interpret(catalog,spreads,base)
    var request={spreadId:questionless.spreadId,cards:questionless.cards.map(function(item) { return {positionId:item.positionId,cardId:item.cardId,orientation:item.orientation} }),originalQuestion:"Will this definitely work?",topicLens:"general",tradition:"rws",reversalPolicy:questionless.reversalPolicy,elementalDignity:"disabled",narratorId:"clear-reflective-v1"}
    var recomposed=Interpretation.interpret(catalog,spreads,request)
    verify(recomposed.id !== questionless.id)
    compare(recomposed.reframeReason,"prediction")
    var panel=Interpretation.toPanelReading(catalog,spreads,recomposed,{kind:"spread",createdAt:null})
    var copied=Interpretation.copyReading(catalog,spreads,recomposed,8000)
    var packetText=Interpretation.buildHandoff(catalog,spreads,recomposed,12000)
    var packet=Interpretation.handoffPacket(packetText)
    var argv=["omarchy","agent","prompt",packetText]
    compare(panel.spreadName,"Context / Friction / Doorway")
    compare(panel.originalQuestion,recomposed.originalQuestion)
    compare(panel.normalizedQuestion,recomposed.normalizedQuestion)
    verify(copied.indexOf(recomposed.id) >= 0)
    verify(copied.indexOf(recomposed.originalQuestion) >= 0)
    compare(packet.semantic.readingId,recomposed.id)
    compare(packet.question.normalized,panel.normalizedQuestion)
    compare(argv.length,4)
    compare(argv[3],packetText)
  }
}
