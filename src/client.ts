
import io from 'socket.io-client';

import { 
    DUMP_DATA, 
    findName,
    formats_GLES2, 
    glCompreesdTexImage2D_DATA, 
    glCompreesdTexSubImage2D_DATA, 
    glTexImage2D_DATA, 
    glTexSubImage2D_DATA, 
    internalFormats_GLES2, 
    targets_GLES2, 
    types_GLES2 
} from "./utils"

const findValue = (name: string, names: { [key: string]: number }): number | undefined => {
    return names[name];
}


// client.ts
function base64ToUint8Array(base64String: string): Uint8Array {
    const base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let rawString = '';

    const paddingLength = base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0;
    const isPadded = paddingLength > 0;
    base64String = base64String.substring(0, base64String.length - paddingLength);

    for (let i = 0; i < base64String.length; i += 4) {
        const n = (base64Characters.indexOf(base64String[i]) << 18) | 
                  (base64Characters.indexOf(base64String[i+1]) << 12) | 
                  (base64Characters.indexOf(base64String[i+2]) << 6) | 
                  base64Characters.indexOf(base64String[i+3]);
        
        rawString += String.fromCharCode((n >>> 16) & 255) + 
                     String.fromCharCode((n >>> 8) & 255) + 
                     String.fromCharCode(n & 255);
    }

    if (isPadded) {
        const n = (base64Characters.indexOf(base64String[base64String.length - 2]) << 18) | (base64Characters.indexOf(base64String[base64String.length - 1]) << 12);
        rawString += String.fromCharCode((n >>> 16) & 255);
    }

    const result = new Uint8Array(rawString.length);
    for (let i = 0; i < rawString.length; i++) {
        result[i] = rawString.charCodeAt(i);
    }
    return result;
}



const drawTexture = (canvas:HTMLCanvasElement, dumpData:DUMP_DATA) => {
    // main.ts

    const fun = dumpData.function;
    const width = dumpData.data.width;
    const height = dumpData.data.height;

    canvas.width = width;
    canvas.height = height;

    let gl :any = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    gl.viewport(0, 0, width, height);

    let texture = gl.createTexture();

    let target = gl.TEXTURE_2D;

    switch(fun){
        case 'glTexImage2D': {
            const data = dumpData.data as glTexImage2D_DATA;
            const pixelData = base64ToUint8Array(data.data)
            // target = data.target;
            gl.bindTexture(target, texture);
            gl.texImage2D(
                target,
                data.level,
                data.internalFormat,
                data.width, 
                data.height, 
                data.border, 
                data.format,
                data.type,
                pixelData);
        }
        break;

        case 'glTexSubImage2D': {
            const data = dumpData.data as glTexSubImage2D_DATA;
            const pixelData = base64ToUint8Array(data.data)
            // target = data.target;
            gl.bindTexture(target, texture);
            gl.texImage2D(
                target,
                data.level,       // level
                data.format,      // internalFormat
                data.width,       // width
                data.height,      // height
                0,                // border
                data.format,      // format
                data.type,        // type
                null              // data (null for an empty texture)
              );
            gl.texSubImage2D(
                data.target,
                data.level,
                data.xoffset,
                data.yoffset,
                data.width, 
                data.height, 
                data.format,
                data.type,
                pixelData);
        }
        break;


        case 'glCompressedTexSubImage2D':{
            const data = dumpData.data as glCompreesdTexSubImage2D_DATA;
            // target = data.target;
            gl.bindTexture(target, texture);
            const pixelData = base64ToUint8Array(data.data)
            console.log(
                'target', data.target,  findName(data.target, targets_GLES2), gl.TEXTURE_2D,
                'level', data.level, 
                'xoffset', data.xoffset, 
                'yoffset', data.yoffset, 
                'width', data.width, 
                'height', data.height, 
                'format', data.format, findName(data.format, formats_GLES2),
                'pixelData', pixelData);
            gl.compressedTexSubImage2D(
                data.target,
                data.level,
                data.xoffset,
                data.yoffset,
                data.width, 
                data.height, 
                data.format,
                pixelData);
        }
        break;

        default:
            console.log('unknown function: ' + fun);
    }


    // Set the parameters so we can render any size image
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Upload an empty 1x1 texture
    // create a simple 2d drawing program
    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0, 1);
            v_texCoord = a_texCoord;
        }
    `);
    gl.compileShader(vertexShader);
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_texture;
        void main() {
            gl_FragColor = texture2D(u_texture, v_texCoord);
        }
    `);
    gl.compileShader(fragmentShader);
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // look up where the vertex data needs to go.
    let positionLocation = gl.getAttribLocation(program, "a_position");
    let texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    let textureLocation = gl.getUniformLocation(program, "u_texture");

    // provide texture coordinates for the rectangle.
    let texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // provide positions for the rectangle.
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
        1.0, -1.0,
        1.0,  1.0,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // draw the rectangle
    gl.bindTexture(target, texture);
    gl.uniform1i(textureLocation, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);


}


const init = async (appDiv : HTMLDivElement) => {


    const list = document.createElement('ul');
 
    const detailDiv = document.createElement('div');
    appDiv.appendChild(detailDiv);
 
    const canvas = document.createElement('canvas');
    appDiv.appendChild(canvas)

    var socket = io();
    socket.on('images', (images:{
            fn: string;
            data: DUMP_DATA;
        }[]) => {

            console.log(`images:`, images.length);

        {
            images.forEach((image) => {
                const dumpData = image.data;
                const key = image.fn;

                const listItem = document.createElement('li');

                {
                    const fun = dumpData.function;
                    if (fun == 'glTexImage2D') {
                        const data = dumpData.data as glTexImage2D_DATA;
                        listItem.textContent = `${key} ${fun} ${data.level} ${data.internalFormat} ${data.width} ${data.height} ${data.format} ${data.type} `
                    }
                    else{
                        listItem.textContent = `${key} `
                    }
                }
                listItem.addEventListener('click', () => {
                    updateDetail(key, dumpData);
                });


                list.appendChild(listItem);
            });
        }
    });
    appDiv.appendChild(list);
    function updateDetail(name: string, item: DUMP_DATA) {
        detailDiv.textContent = name;
        console.log('updateDetail', name, item);

        drawTexture(canvas, item);
    }



    const firstChild = list.firstChild;

    if (firstChild && firstChild instanceof HTMLElement) {
        firstChild.click();
    }

}

const appDiv = document.getElementById('app') as HTMLDivElement;
if (appDiv) {

    init(appDiv)

}

