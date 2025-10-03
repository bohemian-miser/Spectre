export const tile_names = [
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi',
    'Pi', 'Sigma', 'Phi', 'Psi'
];

// Color map from Figure 5.3
export const colmap53: { [key: string]: number[] } = {
    'Gamma': [203, 157, 126],
    'Gamma1': [203, 157, 126],
    'Gamma2': [203, 157, 126],
    'Delta': [163, 150, 133],
    'Theta': [208, 215, 150],
    'Lambda': [184, 205, 178],
    'Xi': [211, 177, 144],
    'Pi': [218, 197, 161],
    'Sigma': [191, 146, 126],
    'Phi': [228, 213, 167],
    'Psi': [224, 223, 156]
};

export const colmap_orig: { [key: string]: number[] } = {
    'Gamma': [255, 255, 255],
    'Gamma1': [255, 255, 255],
    'Gamma2': [255, 255, 255],
    'Delta': [220, 220, 220],
    'Theta': [255, 191, 191],
    'Lambda': [255, 160, 122],
    'Xi': [255, 242, 0],
    'Pi': [135, 206, 250],
    'Sigma': [245, 245, 220],
    'Phi': [0, 255, 0],
    'Psi': [0, 255, 255]
};

export const colmap_mystics: { [key: string]: number[] } = {
    'Gamma': [196, 201, 169],
    'Gamma1': [196, 201, 169],
    'Gamma2': [156, 160, 116],
    'Delta': [247, 252, 248],
    'Theta': [247, 252, 248],
    'Lambda': [247, 252, 248],
    'Xi': [247, 252, 248],
    'Pi': [247, 252, 248],
    'Sigma': [247, 252, 248],
    'Phi': [247, 252, 248],
    'Psi': [247, 252, 248]
};

export const colmap_pride: { [key: string]: number[] } = {
    'Gamma': [255, 255, 255],
    'Gamma1': [97, 57, 21],
    'Gamma2': [0, 0, 0],
    'Delta': [2, 129, 33],
    'Theta': [0, 76, 255],
    'Lambda': [118, 0, 136],
    'Xi': [229, 0, 0],
    'Pi': [255, 175, 199],
    'Sigma': [115, 215, 238],
    'Phi': [255, 141, 0],
    'Psi': [255, 238, 0]
};

export const THUMB_MULT = 3; // thumbnails 3x larger
export const thumbWidth = 64 * THUMB_MULT;
export const thumbHeight = 64 * THUMB_MULT;
export const thumbScale = 14 * THUMB_MULT; // scale factor for thumbnail
