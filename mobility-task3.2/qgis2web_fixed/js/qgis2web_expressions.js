// Aggregates
// Conditionals
function fnc_coalesce(values, context) {
    for (i = 0; i < values.length; i++) { if (values[i] !== null) { return values[i]; } }
    return 'ERROR';
};
// Math
function fnc_round(values, context) { return Math.round(values[0] * Math.pow(10, values[1])) / Math.pow(10, values[1]); };
function fnc_abs(values, context) { return Math.abs(values[0]); };
function fnc_sqrt(values, context) { return Math.sqrt(values[0]); };
function fnc_to_string(values, context) { return String(values[0]); };
function fnc_lower(values, context) { return values[0].toLowerCase(); };

// FIXED label expression: was returning null for duration >= 60
function exp_label_Stoplocationsmerged_2_eval_expression(context) {
    var feature = context.feature;
    var duration = feature.properties['duration'];
    if (duration === null || duration === undefined) return null;
    if (duration >= 60) {
        return (Math.round(duration / 60 * 10) / 10) + ' hours';
    } else {
        return Math.round(duration) + ' min';
    }
}
