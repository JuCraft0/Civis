const fs = require('fs');
const path = require('path');

const questions = require('./questions.json');

// Questions that need to be inverted (6 - answer)
const invertedQuestions = [5, 10, 14, 19, 67, 69, 73, 75, 77, 80, 88, 97];

function calculateAverage(answers, questionList) {
    let sum = 0;
    let weightSum = 0;
    for (const q of questionList) {
        const val = answers[q.id];
        if (val) {
            sum += val * q.weight;
            weightSum += q.weight;
        }
    }
    return weightSum > 0 ? sum / weightSum : 0;
}

function calculateEvaluation(rawAnswers) {
    // rawAnswers is an object { "1": 3, "2": 4, ..., "100": 5 }
    
    // Step 2: Invert questions
    const answers = { ...rawAnswers };
    for (const qId of invertedQuestions) {
        if (answers[qId]) {
            answers[qId] = 6 - answers[qId];
        }
    }

    // Safe accessor
    const getA = (id) => answers[id] || 3; // Default to 3 if missing

    // Step 3: Main Dimensions
    
    // Big Five: Openness
    const openKern = calculateAverage(answers, [
        {id: 1, weight: 1.2}, {id: 2, weight: 1.3}, {id: 3, weight: 1.1}, {id: 4, weight: 0.9}, {id: 5, weight: 1.0}
    ]);
    const openSec = (getA(63)*0.3 + getA(92)*0.2 + getA(98)*0.2) / 0.7; // Normalized
    const openness = openKern * 0.7 + openSec * 0.3;

    // Gewissenhaftigkeit
    const gewissenKern = calculateAverage(answers, [
        {id: 6, weight: 1.4}, {id: 7, weight: 1.3}, {id: 8, weight: 1.5}, {id: 9, weight: 1.2}, {id: 10, weight: 1.4}
    ]);
    const gewissenSec = (getA(27)*0.2 + getA(30)*0.2 + getA(62)*0.2) / 0.6;
    const conscientiousness = gewissenKern * 0.75 + gewissenSec * 0.25;

    // Extraversion
    const extraKern = calculateAverage(answers, [
        {id: 11, weight: 1.5}, {id: 12, weight: 1.3}, {id: 13, weight: 1.0}, {id: 14, weight: 1.4}, {id: 15, weight: 1.2}
    ]);
    const extraSec = (getA(41)*0.3 + getA(48)*0.2) / 0.5;
    const extraversion = extraKern * 0.75 + extraSec * 0.25;

    // Verträglichkeit
    const vertKern = calculateAverage(answers, [
        {id: 16, weight: 1.3}, {id: 17, weight: 1.4}, {id: 18, weight: 1.1}, {id: 19, weight: 1.2}, {id: 20, weight: 1.0}
    ]);
    const vertSec = (getA(36)*0.3 + getA(40)*0.3 + getA(50)*0.2) / 0.8;
    const agreeableness = vertKern * 0.7 + vertSec * 0.3;

    // Emotionale Stabilität
    const emoKern = calculateAverage(answers, [
        {id: 66, weight: 1.6}, {id: 67, weight: 1.4}, {id: 69, weight: 1.3}, {id: 72, weight: 1.5}, {id: 73, weight: 1.2}, {id: 75, weight: 1.4}
    ]);
    const emoSec = (getA(68)*0.3 + getA(74)*0.2) / 0.5;
    const emotionalStability = emoKern * 0.8 + emoSec * 0.2;

    // Work Competence
    const selfManagement = calculateAverage(answers, [
        {id: 6, weight: 1.4}, {id: 8, weight: 1.5}, {id: 10, weight: 1.4}, {id: 24, weight: 1.5}, {id: 30, weight: 1.4}, {id: 31, weight: 1.5}
    ]);
    const workMotivation = calculateAverage(answers, [
        {id: 21, weight: 1.2}, {id: 25, weight: 1.0}, {id: 26, weight: 1.2}, {id: 27, weight: 1.1}, {id: 35, weight: 1.2}
    ]);
    const productivity = getA(30)*0.5 + getA(29)*0.3 + getA(22)*0.2; // Note: 29 is inverted in original text but let's assume getA already handles invert list, Wait 29 is not in invert list? Original text says Q29inv, let's invert it manually here.
    const q29inv = 6 - getA(29);
    const productivityScore = getA(30)*0.5 + q29inv*0.3 + getA(22)*0.2;

    // Social Intelligence
    const empathy = calculateAverage(answers, [
        {id: 36, weight: 1.5}, {id: 38, weight: 1.3}, {id: 40, weight: 1.6}, {id: 49, weight: 1.3}
    ]);
    const communication = getA(43)*0.4 + getA(37)*0.3 + getA(36)*0.3;
    const socialFlex = calculateAverage(answers, [
        {id: 43, weight: 1.4}, {id: 48, weight: 1.0}, {id: 93, weight: 1.5}
    ]);

    // Decision Making
    const analytical = calculateAverage(answers, [{id: 52, weight: 1.4}, {id: 56, weight: 1.3}, {id: 62, weight: 1.3}]);
    const intuitive = calculateAverage(answers, [{id: 51, weight: 1.2}, {id: 57, weight: 1.2}, {id: 63, weight: 1.4}]);
    const decisionBalance = Math.abs(getA(52) - getA(51)) + Math.abs(getA(56) - getA(57));
    const risk = calculateAverage(answers, [{id: 58, weight: 1.3}, {id: 59, weight: 1.1}, {id: 60, weight: 1.4}]); // wait 59 is inverted in text. I didn't invert 59 in invertedQuestions. I'll do it.
    
    // Fix inverted that were not in global list
    const q59inv = 6 - getA(59);
    const riskScore = (getA(58)*1.3 + q59inv*1.1 + getA(60)*1.4) / (1.3+1.1+1.4);

    // Leadership
    let leadership = calculateAverage(answers, [
        {id: 76, weight: 1.5}, {id: 77, weight: 1.2}, {id: 78, weight: 1.4}, {id: 83, weight: 1.3}, {id: 85, weight: 1.4}
    ]);
    if (getA(31) >= 4) leadership *= 1.15;
    if (getA(54) >= 4) leadership *= 1.1;
    if (getA(40) >= 4) leadership *= 1.1;
    if (getA(82) >= 4) leadership *= 1.1;
    // Cap at 5.0
    leadership = Math.min(5.0, leadership);

    // Archetypes
    const archetypes = [];
    if (openness >= 4.0 && getA(1) >= 4 && getA(3) >= 4 && getA(63) >= 4 && getA(98) >= 4 && riskScore >= 3.5) archetypes.push("Der Visionär");
    if (getA(2) >= 4 && getA(52) >= 4 && getA(56) >= 4 && getA(62) >= 4 && conscientiousness >= 4.0 && getA(7) >= 4 && emotionalStability >= 3.5) archetypes.push("Der Analytiker");
    if (extraversion >= 4.0 && getA(78) >= 4 && getA(40) >= 4 && getA(43) >= 4 && getA(11) >= 3.5 && getA(12) >= 3.5 && getA(15) >= 3.5) archetypes.push("Der Motivator");
    if (conscientiousness >= 4.5 && getA(6) >= 4 && getA(8) >= 4 && getA(9) >= 4 && getA(30) >= 4 && getA(27) >= 3.5) archetypes.push("Der Organisator");
    if (agreeableness >= 4.0 && getA(40) >= 4 && getA(43) >= 4 && getA(49) >= 4 && getA(16) >= 4 && getA(36) >= 4) archetypes.push("Der Diplomat");
    if (getA(28) >= 4 && getA(58) <= 2.5 && getA(99) >= 3.5) archetypes.push("Der Pragmatiker");
    if (getA(7) >= 4.5 && getA(27) >= 4.5 && conscientiousness >= 4.5 && getA(28) <= 2 && emotionalStability <= 3.0) archetypes.push("Der Perfektionist");
    if (getA(11) >= 4 && getA(12) >= 4 && getA(15) >= 4 && getA(41) >= 4 && getA(43) >= 4 && extraversion >= 4.5 && getA(42) <= 2) archetypes.push("Der Netzwerker");
    if (getA(2) >= 4 && getA(52) >= 4 && getA(62) >= 4 && getA(60) >= 4 && getA(31) >= 4) archetypes.push("Der Stratege");
    if (getA(66) >= 4.5 && getA(72) >= 4.5 && getA(21) >= 4 && getA(60) >= 4 && getA(85) >= 4) archetypes.push("Der Krisenmanager");
    if (getA(40) >= 4 && getA(81) >= 4 && getA(82) >= 4 && getA(17) >= 4 && getA(36) >= 4 && agreeableness >= 4.0) archetypes.push("Der Mentor");
    if (getA(24) >= 4.5 && getA(31) >= 4.5 && getA(58) >= 4 && getA(76) >= 4 && getA(98) >= 4) archetypes.push("Der Unternehmer");

    return {
        dimensions: {
            openness: parseFloat(openness.toFixed(2)),
            conscientiousness: parseFloat(conscientiousness.toFixed(2)),
            extraversion: parseFloat(extraversion.toFixed(2)),
            agreeableness: parseFloat(agreeableness.toFixed(2)),
            emotionalStability: parseFloat(emotionalStability.toFixed(2)),
            selfManagement: parseFloat(selfManagement.toFixed(2)),
            workMotivation: parseFloat(workMotivation.toFixed(2)),
            productivity: parseFloat(productivityScore.toFixed(2)),
            empathy: parseFloat(empathy.toFixed(2)),
            communication: parseFloat(communication.toFixed(2)),
            socialFlexibility: parseFloat(socialFlex.toFixed(2)),
            analytical: parseFloat(analytical.toFixed(2)),
            intuitive: parseFloat(intuitive.toFixed(2)),
            decisionBalance: parseFloat(decisionBalance.toFixed(2)),
            risk: parseFloat(riskScore.toFixed(2)),
            leadership: parseFloat(leadership.toFixed(2))
        },
        archetypes: archetypes.length > 0 ? archetypes : ["Generalist"]
    };
}

module.exports = {
    calculateEvaluation,
    questions
};
