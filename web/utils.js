// Utility functions
function pt(x, y) { return { x: x, y: y }; }
function mul(A, B) { return [A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2], A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5]]; }
function inv(T) { const det = T[0] * T[4] - T[1] * T[3]; return [T[4] / det, -T[1] / det, (T[1] * T[5] - T[2] * T[4]) / det, -T[3] / det, T[0] / det, (T[2] * T[3] - T[0] * T[5]) / det]; };
function transPt(M, P) { return pt(M[0] * P.x + M[1] * P.y + M[2], M[3] * P.x + M[4] * P.y + M[5]); }
function center_of_mass(pts) { let cx = 0, cy = 0; for (const p of pts) { cx += p.x; cy += p.y; } return pt(cx / pts.length, cy / pts.length); }
function get_inset_point(p1, p2, inset = .3) { const mid_x = (p1.x + p2.x) / 2, mid_y = (p1.y + p2.y) / 2; const dx = p2.x - p1.x, dy = p2.y - p1.y; let perp_x = -dy, perp_y = dx; const length = Math.sqrt(perp_x ** 2 + perp_y ** 2); perp_x = perp_x / length * inset; perp_y = perp_y / length * inset; return pt(mid_x + perp_x, mid_y + perp_y); }
function rgbToHex(rgb) { return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1); }
function trot(ang) { const c = Math.cos(ang); const s = Math.sin(ang); return [c, -s, 0, s, c, 0]; }
function ttrans(tx, ty) { return [1, 0, tx, 0, 1, ty]; }
function psub(p, q) { return { x: p.x - q.x, y: p.y - q.y }; }

const ident = [1, 0, 0, 0, 1, 0];
