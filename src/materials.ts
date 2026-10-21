/** Original, deterministic Canvas materials and equipment. No proprietary game textures. */
export const TEX = 128;
const hash = (x: number, y: number, seed = 0) => { let n = Math.imul(x + seed, 374761393) ^ Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return (n ^ (n >>> 16)) >>> 0; };
export type Material = {
    canvas: HTMLCanvasElement;
    pixels: Uint8ClampedArray;
};
const materials = new Map<string, Material>();
export function material(kind: string, seed = 0): Material {
    const key = kind + seed;
    if (materials.has(key))
        return materials.get(key)!;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TEX;
    const c = canvas.getContext('2d')!, image = c.createImageData(TEX, TEX);
    for (let y = 0; y < TEX; y++)
        for (let x = 0; x < TEX; x++) {
            const i = (y * TEX + x) * 4, n = hash(x, y, seed), grain = (n % 17) - 8;
            let r = 0, g = 0, b = 0;
            if (kind === 'wall') {
                const top = y < 44, lower = y > 82;
                [r, g, b] = top ? [130, 132, 120] : lower ? [42, 57, 55] : [91, 111, 103];
                if (x < 3 || x > 124 || y === 43 || y === 82)
                    [r, g, b] = [31, 42, 40];
                if (y > 74 && y < 82)
                    [r, g, b] = [177, 146, 64];
                if ((n % 173) < 3 || y > 115 && (n % 3 === 0)) {
                    r -= 32;
                    g -= 25;
                    b -= 21;
                }
                if ((x === 10 || x === 117) && (y === 13 || y === 112))
                    [r, g, b] = [182, 181, 157];
                if (x > 102 && x < 106) {
                    r -= 15;
                    g -= 17;
                    b -= 16;
                }
            }
            else if (kind === 'door') {
                [r, g, b] = [67, 80, 78];
                if (x % 32 < 3)
                    [r, g, b] = [25, 33, 33];
                if (y > 81 && y < 105)
                    [r, g, b] = ((x + y) % 32 < 16) ? [179, 141, 51] : [26, 33, 31];
                if (y < 9)
                    [r, g, b] = [34, 46, 45];
                if (x > 54 && x < 72 && y > 32 && y < 62)
                    [r, g, b] = [133, 148, 137];
            }
            else if (kind === 'cabinet') {
                [r, g, b] = seed % 2 ? [66, 82, 78] : [99, 104, 92];
                if (y % 42 < 3 || x < 6 || x > 121)
                    [r, g, b] = [22, 31, 31];
                if (x > 20 && x < 106 && y > 24 && y < 52 && y % 6 < 3)
                    [r, g, b] = [23, 36, 36];
                if (x > 104 && x < 111 && y > 66 && y < 95)
                    [r, g, b] = [166, 168, 141];
                if (x > 12 && x < 45 && y > 69 && y < 87)
                    [r, g, b] = [177, 156, 96];
            }
            else if (kind === 'ceiling') {
                [r, g, b] = [54, 61, 58];
                if (x % 64 < 5 || y % 64 < 5)
                    [r, g, b] = [25, 34, 33];
                if (x > 75 && x < 112) {
                    [r, g, b] = [75, 83, 77];
                    if (y % 8 < 2)
                        [r, g, b] = [33, 42, 40];
                }
            }
            else {
                [r, g, b] = [70, 75, 68];
                if (x % 64 < 2 || y % 64 < 2)
                    [r, g, b] = [39, 45, 41];
                if (n % 151 < 3) {
                    r -= 19;
                    g -= 19;
                    b -= 15;
                }
                if (kind === 'grate') {
                    [r, g, b] = (x % 9 < 4 || y % 9 < 3) ? [71, 77, 69] : [23, 32, 30];
                }
                if ((x < 12 || x > 116) && y % 24 < 12)
                    [r, g, b] = [122, 113, 63];
            }
            image.data[i] = Math.max(0, r + grain);
            image.data[i + 1] = Math.max(0, g + grain);
            image.data[i + 2] = Math.max(0, b + grain);
            image.data[i + 3] = 255;
        }
    c.putImageData(image, 0, 0);
    const result = { canvas, pixels: image.data };
    materials.set(key, result);
    return result;
}
const equipment = new Map<string, HTMLCanvasElement>();
export function equipmentSprite(kind: string, accent = '#b4c49a', label = 'ASTER'): HTMLCanvasElement {
    const key = kind + accent + label;
    if (equipment.has(key))
        return equipment.get(key)!;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 160;
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    const box = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
    if (kind === 'console') {
        box(26, 130, 76, 14, '#171f1d');
        box(39, 88, 50, 44, '#47554c');
        box(33, 88, 7, 45, '#1d2c27');
        box(19, 33, 90, 64, '#243a35');
        box(22, 29, 84, 9, '#849489');
        box(28, 42, 71, 37, '#0c1d1a');
        box(31, 45, 65, 3, accent);
        box(31, 55, 36, 2, '#5c8070');
        box(31, 62, 54, 2, '#5c8070');
        box(31, 69, 26, 3, accent);
        box(24, 82, 80, 9, '#687568');
        for (let i = 0; i < 5; i++)
            box(31 + i * 13, 83, 7, 4, i === 3 ? '#d3a85e' : '#293b32');
        box(76, 53, 16, 17, '#3c6750');
        box(81, 58, 5, 7, accent);
        box(42, 102, 39, 12, '#a39e7f');
        c.fillStyle = '#35483a';
        c.font = '5px monospace';
        c.fillText('R / ' + label.slice(0, 10).toUpperCase(), 44, 110);
    }
    else if(kind==='radio'){box(17,26,94,100,'#293d34');box(23,31,82,8,'#a1aa89');box(29,48,70,32,'#101f19');c.strokeStyle=accent;c.lineWidth=2;c.beginPath();for(let x=30;x<98;x++){const y=63+Math.sin(x*.35)*6;c.lineTo(x,y);}c.stroke();for(let i=0;i<6;i++)box(30+i*11,90,6,9,'#a4ad8b');box(81,106,13,8,accent);}
    else if(kind==='medical'){box(23,26,82,104,'#727c68');box(28,31,72,93,'#b1b395');box(58,43,15,43,'#54775d');box(45,56,41,15,'#54775d');box(38,99,51,4,'#5e705b');box(38,109,33,3,'#5e705b');}
    else if(kind==='tools'){box(15,27,98,105,'#4a573f');for(let y=33;y<124;y+=9)for(let x=21;x<106;x+=9)box(x,y,2,2,'#223526');for(let i=0;i<4;i++){const x=29+i*23;box(x,55,5,52,'#aaa78a');box(x-3,45,11,13,'#78846b');box(x-3,41,3,10,'#aaa78a');box(x+5,41,3,10,'#aaa78a');}box(22,118,84,6,'#9b946f');}
    else if(kind==='security'){box(18,30,92,94,'#394d40');box(25,39,78,57,'#1b2b24');for(let i=0;i<4;i++){const x=29+(i%2)*37,y=43+Math.floor(i/2)*24;box(x,y,32,20,'#69826b');box(x+3,y+4,25,2,'#9ead8b');box(x+5,y+10,13,3,'#4a6852');}box(33,106,13,6,accent);box(80,106,13,6,'#af9d72');}
    else if (kind === 'pod') {
        box(27, 138, 74, 13, '#3a463e');
        box(37, 22, 54, 113, '#34463f');
        box(44, 31, 40, 91, '#152d29');
        box(47, 34, 6, 85, '#5f8c79');
        box(54, 40, 24, 65, '#496a55');
        box(29, 19, 71, 12, '#a4a58c');
        box(30, 126, 69, 14, '#919879');
        box(51, 64, 25, 27, '#b4c49a');
        c.strokeStyle = '#283d34';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(64, 77, 10, 0, 7);
        c.stroke();
        box(32, 117, 65, 4, accent);
    }
    else if (kind === 'fan') {
        box(17, 22, 94, 94, '#1d2c28');
        box(22, 27, 84, 84, '#657061');
        c.fillStyle = '#263c33';
        c.beginPath();
        c.arc(64, 69, 34, 0, 7);
        c.fill();
        c.fillStyle = '#9a9c80';
        for (let i = 0; i < 4; i++) {
            c.save();
            c.translate(64, 69);
            c.rotate(i * Math.PI / 2);
            c.fillRect(-6, -28, 15, 24);
            c.restore();
        }
        box(59, 64, 10, 10, '#27392f');
        for (let i = 0; i < 7; i++)
            box(27, 34 + i * 10, 74, 2, '#25372c');
    }
    else if (kind === 'pipe') {
        box(48, 1, 25, 151, '#677461');
        box(42, 28, 37, 10, '#929984');
        box(42, 116, 37, 10, '#929984');
        box(69, 70, 30, 17, '#687560');
        c.strokeStyle = '#a06b43';
        c.lineWidth = 5;
        c.beginPath();
        c.arc(95, 77, 14, 0, 7);
        c.stroke();
        box(87, 75, 17, 4, '#a06b43');
        box(93, 69, 4, 17, '#a06b43');
    }
    else if (kind === 'crate') {
        box(15, 68, 98, 80, '#38473b');
        box(19, 73, 91, 65, '#6d765c');
        box(25, 73, 6, 64, '#293b2e');
        box(92, 73, 6, 64, '#293b2e');
        box(20, 91, 87, 7, '#92957b');
        box(42, 107, 43, 21, '#b1ab83');
        c.fillStyle = '#43513b';
        c.font = '7px monospace';
        c.fillText('RESEARCH', 45, 120);
    }
    else {
        box(23, 23, 82, 111, '#3a4940');
        box(30, 31, 68, 22, accent);
        box(33, 35, 62, 14, '#172f27');
        c.fillStyle = accent;
        c.font = 'bold 8px monospace';
        c.textAlign = 'center';
        c.fillText(label.toUpperCase().slice(0, 12), 64, 45);
        for (let i = 0; i < 7; i++)
            box(35, 64 + i * 7, 58, 3, '#21362b');
        box(92, 110, 4, 12, '#a1aa8d');
    }
    if(['console','pod','crate','pipe'].includes(kind)){const pixels=c.getImageData(0,0,128,160).data;let bottom=159;outer:for(;bottom>=0;bottom--)for(let x=0;x<128;x++)if(pixels[(bottom*128+x)*4+3]>0)break outer;const offset=159-bottom;if(offset>0&&bottom>=0){const copy=document.createElement('canvas');copy.width=128;copy.height=160;copy.getContext('2d')!.drawImage(canvas,0,0);c.clearRect(0,0,128,160);c.drawImage(copy,0,offset);}}
    equipment.set(key, canvas);
    return canvas;
}
export function signSprite(title: string, code: string, accent: string) { const key = 'sign' + title + code; if (equipment.has(key))
    return equipment.get(key)!; const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 88; const c = canvas.getContext('2d')!; c.fillStyle = '#222e28'; c.fillRect(0, 0, 320, 88); c.fillStyle = '#a5ad93'; c.fillRect(3, 3, 314, 82); c.fillStyle = '#29392e'; c.fillRect(7, 7, 306, 74); c.fillStyle = accent; c.fillRect(7, 7, 8, 74); c.font = 'bold 20px monospace'; c.fillText(title.toUpperCase(), 27, 40, 273); c.font = '10px monospace'; c.fillStyle = '#b5b79d'; c.fillText(code.toUpperCase(), 28, 63, 270); for (const x of [20, 301])
    for (const y of [15, 72]) {
        c.fillStyle = '#67745f';
        c.fillRect(x, y, 3, 3);
    } equipment.set(key, canvas); return canvas; }
