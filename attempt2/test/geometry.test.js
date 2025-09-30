// Basic test harness for geometry and label drawing
// Run in browser console or with Node (after TypeScript migration)

function assertEqual(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
        throw new Error('Assertion failed: ' + msg + ' | ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
    }
}

// Test pt, psub, padd
assertEqual(pt(1,2), {x:1, y:2}, 'pt');
assertEqual(psub(pt(3,4), pt(1,2)), {x:2, y:2}, 'psub');
assertEqual(padd(pt(1,2), pt(3,4)), {x:4, y:6}, 'padd');

// Test affine matrix ops
const T = ttrans(5, 7);
assertEqual(transPt(T, pt(1,2)), {x:6, y:9}, 'transPt translation');

const R = trot(Math.PI/2);
const p = pt(1,0);
const rp = transPt(R, p);
assertEqual(Math.round(rp.x), 0, 'rot x');
assertEqual(Math.round(rp.y), 1, 'rot y');

console.log('All geometry tests passed.');

// Edge label drawing utility smoke test
try {
    drawEdgeLabels({
        save:()=>{}, translate:()=>{}, scale:()=>{}, textAlign:()=>{}, textBaseline:()=>{}, font:'', strokeStyle:'', fillStyle:'', strokeText:()=>{}, fillText:()=>{}, restore:()=>{}
    }, [pt(0,0), pt(1,0), pt(1,1)], ['A','B','C'], ident, {fontPx:12, insetPx:2, useP5:false});
    console.log('drawEdgeLabels smoke test passed.');
} catch(e) {
    console.error('drawEdgeLabels test failed:', e);
}
