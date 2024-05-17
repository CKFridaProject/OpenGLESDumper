
import io from 'socket.io-client';

import { 
    DUMP_DATA, 
    LEVEL_DATA, 
    TEXTURES_TYPE, 
    Texture_DATA, 
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
import { parse } from 'querystring';


const findValue = (name: string, names: { [key: string]: number }): number | undefined => {
    return names[name];
}

function isPowerOf2(value: number) {
    // If value is power of two, the bitwise AND operation (&) of value and (value - 1) will be zero.                                    
    // It works because powers of two in binary form always have just one bit set. The rest of the bits are zero.                        
    // So, (value & (value - 1)) will be zero for power of two values.                                                                   
    // For example, 4 in binary is 100, and 3 in binary is 011. And bitwise AND of 4 and 3 is 000.                                       
    return (value & (value - 1)) == 0;
}

function drawTexture2DGL(gl: any, texture: any) {

    let target = gl.TEXTURE_2D;
    gl.bindTexture(target, texture);

    // Clamp to edge and use linear filtering.                                                                                   
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

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
        -1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // draw the rectangle
    gl.bindTexture(target, texture);
    gl.uniform1i(textureLocation, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.finish();
}


function calcCompressedDataLength(
    width: number, 
    height: number, 
    format: number, 
    ext_etc: any, 
    ext_etc1: any, 
    ext_astc: any): number {
    let blockSizeInBits: number;

    switch (format) {
        case ext_etc.COMPRESSED_RGB8_ETC2:
            blockSizeInBits = 64; // ETC2 uses 4x4 blocks at 64 bits/block
            break;
        case ext_etc.COMPRESSED_RGBA8_ETC2_EAC:
            blockSizeInBits = 128; // ETC2 uses 4x4 blocks at 128 bits/block for RGBA8
            break;
        case ext_astc.COMPRESSED_RGBA_ASTC_4x4_KHR:
            blockSizeInBits = 128; // ASTC uses 128 bits/block for all formats
            break;
        case ext_astc.COMPRESSED_RGBA_ASTC_8x8_KHR:
            blockSizeInBits = 128; // ASTC uses 128 bits/block for all formats
            break;
        case ext_etc1.COMPRESSED_RGB_ETC1_WEBGL:
            blockSizeInBits = 64; // ETC1 is 64 bits per block
            break;
        default:
            throw new Error('Unsupported format ' + format);
    }

    const blockSizeInBytes = blockSizeInBits / 8;
    const numBlocksAcross = Math.ceil(width / 4); // both ETC2 and ASTC use 4x4 blocks
    const numBlocksDown = Math.ceil(height / 4); // both ETC2 and ASTC use 4x4 blocks
    const numBlocks = numBlocksAcross * numBlocksDown;

    return numBlocks * blockSizeInBytes;
}

function getGlCompressImageFormat(format: number, ext_etc: any, ext_etc1: any,  ext_astc: any) {
    const formatName = findName(format, formats_GLES2);
    if (formatName === 'GL_ETC1_RGB8_OES')                  return ext_etc1.COMPRESSED_RGB_ETC1_WEBGL;
    if (formatName === 'GL_COMPRESSED_RGB8_ETC2')           return ext_etc.COMPRESSED_RGB8_ETC2;
    if (formatName === 'GL_COMPRESSED_RGBA8_ETC2_EAC')      return ext_etc.COMPRESSED_RGBA8_ETC2_EAC;
    if (formatName === 'GL_COMPRESSED_RGBA_ASTC_4x4_KHR')   return ext_astc.COMPRESSED_RGBA_ASTC_4x4_KHR;
    if (formatName === 'GL_COMPRESSED_RGBA_ASTC_8x8_KHR')   return ext_astc.COMPRESSED_RGBA_ASTC_8x8_KHR;
    throw new Error(`Unknown format ${format}`);
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


function saveCanvasToFile(gl:any, fn:string) {
    var viewport = gl.getParameter(gl.VIEWPORT);                                                                                     
    var canvasData = new Uint8Array(viewport[2] * viewport[3] * 4);                                                                  
    gl.readPixels(0, 0, viewport[2], viewport[3], gl.RGBA, gl.UNSIGNED_BYTE, canvasData);                                            
    // console.log('canvasData', canvasData)                                                                                          
                                                                                                                                     
    var canvas = document.createElement('canvas');                                                                                   
    canvas.width = viewport[2];                                                                                                      
    canvas.height = viewport[3];                                                                                                     
                                                                                                                                     
    var ctx : any= canvas.getContext('2d');                                                                                               
                                                                                                                                     
    // create ImageData object                                                                                                       
    var idata = ctx.createImageData(canvas.width, canvas.height);                                                                    
                                                                                                                                     
    // set our buffer as source                                                                                                      
    idata.data.set(canvasData);                                                                                                      
                                                                                                                                     
    // update canvas with new data                                                                                                   
    ctx.putImageData(idata, 0, 0);                                                                                                   
                                                                                                                                     
    // get base64-encoded data from the canvas                                                                                       
    var dataURI = canvas.toDataURL(); // default is PNG                                                                              
                                                                                                                                     
    var link = document.createElement('a');                                                                                          
    link.href = dataURI;
    link.download = fn;
    link.click();

}


const appImages = async (appDiv: HTMLDivElement) => {

    var socket = io();
    socket.emit('get_images');
    socket.on('images', (images: {
        fn: string;
        data: DUMP_DATA;
    }[]) => {


        const list = document.createElement('ul');

        appDiv.appendChild(list);

        const detailDiv = document.createElement('div');
        appDiv.appendChild(detailDiv);

        {
            const div = document.createElement('div');
            const btn = document.createElement('button');
            btn.textContent = 'download';
            div.appendChild(btn);
            appDiv.appendChild(div);

            btn.addEventListener('click', () => {
                console.log('download');
                requestAnimationFrame(function () {
                    saveCanvasToFile(gl, 'tt.png')
                })
            });
        }

        {

            const div = document.createElement('div');
            const btn = document.createElement('button');
            btn.textContent = 'batch download';
            div.appendChild(btn);
            appDiv.appendChild(div);

            btn.addEventListener('click', () => {
                (async () => {
                    console.log(`batch download for all images (${countAllImages})`);
                    for (let t = 0; t < countAllImages; t++) {
                        console.log('download', t);
                        const fn = `0000000${t}`.slice(-8) + '.png'
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        const image = images[t];
                        updateDetail(image.fn, image.data);
                        saveCanvasToFile(gl, fn);
                    }
                })();
            });
        }



        const canvas = document.createElement('canvas');
        appDiv.appendChild(canvas)

        const glConfig = {
            preserveDrawingBuffer: true,
        }
        let gl: any = canvas.getContext('webgl', glConfig)
            || canvas.getContext('experimental-webgl', glConfig);
        // Check if the extension is available
        let ext_etc = gl.getExtension('WEBGL_compressed_texture_etc');
        if (!ext_etc) {
            alert('WEBGL_compressed_texture_etc not available');
        }

        let ext_etc1 = gl.getExtension('WEBGL_compressed_texture_etc1');
        if (!ext_etc1) {
            alert('WEBGL_compressed_texture_etc not available');
        }


        // Check if the extension is available
        let ext_astc = gl.getExtension('WEBGL_compressed_texture_astc');
        if (!ext_astc) {
            alert('WEBGL_compressed_texture_astc is not available');
        }

        list.style.overflowY = 'scroll';
        list.style.maxHeight = '200px';

        let selectedIdx = -1; // Will be updated upon user interaction
        let countAllImages = -1;


        console.log(`images:`, images.length);
        countAllImages = images.length;

        {
            // Highlight the selected item
            function highlightSelection() {
                Array.from(list.children).forEach((item, index) => {
                    const li = item as HTMLLIElement;
                    if (index === selectedIdx) {
                        li.style.backgroundColor = "lightblue";  // Use your preferred highlight color
                    } else {
                        li.style.backgroundColor = ""; // Reset color if not selected 
                    }
                });

                const image = images[selectedIdx];

                updateDetail(image.fn, image.data);
            }

            // Add event listener for keydown to the list
            list.addEventListener('keydown', function (event) {
                switch (event.key) {
                    case "ArrowUp":
                        // If not the first item
                        if (selectedIdx > 0) {
                            selectedIdx--;
                        }
                        break;
                    case "ArrowDown":
                        // If not the last item
                        if (selectedIdx < countAllImages - 1) {
                            selectedIdx++;
                        }
                        break;
                }
                highlightSelection();
            });

            images.forEach((image, index) => {
                const dumpData = image.data;
                const fn = image.fn;

                const listItem = document.createElement('li');

                const fun = dumpData.function;
                const data = dumpData.data;
                listItem.textContent = `${fn} ${fun}  ${data.width} ${data.height} `
                listItem.tabIndex = index; // This makes the li focusable
                listItem.addEventListener('click', () => {
                    selectedIdx = index;
                    highlightSelection();
                });


                list.appendChild(listItem);
            });
        }

        const drawImage = (canvas: HTMLCanvasElement, dumpData: DUMP_DATA) => {

            const fun = dumpData.function;
            const width = dumpData.data.width;
            const height = dumpData.data.height;

            canvas.width = width;
            canvas.height = height;


            gl.viewport(0, 0, width, height);
            let target = gl.TEXTURE_2D;

            let texture = gl.createTexture();



            switch (fun) {
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
                        pixelData,        // data (null for an empty texture)
                    );
                }
                    break;


                case 'glCompressedTexSubImage2D': {
                    const data = dumpData.data as glCompreesdTexSubImage2D_DATA;
                    // target = data.target;
                    gl.bindTexture(target, texture);
                    const pixelData = base64ToUint8Array(data.data)
                    const glFormat = getGlCompressImageFormat(data.format, ext_etc, ext_etc1, ext_astc);
                    console.log('target', data.target, findName(data.target, targets_GLES2), gl.TEXTURE_2D,)
                    console.log('level', data.level,)
                    console.log('xoffset', data.xoffset,)
                    console.log('yoffset', data.yoffset,)
                    console.log('width', data.width,)
                    console.log('height', data.height,)
                    console.log('format', data.format, glFormat.toString(16), glFormat)
                    console.log('pixelData', pixelData.length);
                    const pixelDataLength = calcCompressedDataLength(data.width, data.height, glFormat, ext_etc, ext_etc1, ext_astc);
                    gl.compressedTexImage2D(
                        target,
                        0,
                        glFormat,
                        width,
                        height,
                        0,
                        pixelData.slice(0, pixelDataLength),
                    );
                }
                    break;

                default:
                    console.log('unknown function: ' + fun);
            }

            drawTexture2DGL(gl, texture);



        }



        function updateDetail(name: string, item: DUMP_DATA) {
            detailDiv.textContent = name;
            console.log('updateDetail', name, item);

            drawImage(canvas, item);
        }


        const firstChild = list.firstChild;

        if (firstChild && firstChild instanceof HTMLElement) {
            firstChild.click();
        }



    });

}

const appTexture2D = async (appDiv : HTMLDivElement) => {
    var socket = io();
    socket.emit('texture2D');
    socket.on('textures', (textures: TEXTURES_TYPE) => {

        const textDiv = document.createElement('div');
        appDiv.appendChild(textDiv);

        textDiv.textContent = `textures: ${Object.keys(textures).length}`;

        // Create a function to generate the list elements
        function createTree(key:string, textureData: Texture_DATA) {
            const textureNode = document.createElement('li');
            const levels = Object.keys(textureData.levels).length;
            textureNode.textContent = `${key} Type: ${ textureData.type }  Levels: ${levels } Datasize: ${textureData.levels[0].pixels.length} Compressed: ${textureData.levels[0].compressed}`;

            if(levels> 0){
                textureNode.addEventListener('click', () => {
                    drawTexture(canvas, textureData);
                })

            }

            return textureNode;
        }

        const textureList = document.createElement('ul');
        Object.keys(textures).forEach((key) => {
            const textureNode = createTree(key, textures[key]);
            textureList.appendChild(textureNode);
        });

        textureList.style.overflowY = 'scroll';
        textureList.style.maxHeight = '200px';


        appDiv.appendChild(textureList); // Append the list to your container


        const canvas = document.createElement('canvas');
        appDiv.appendChild(canvas)

        let gl: any = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        // Check if the extension is available
        let ext_etc = gl.getExtension('WEBGL_compressed_texture_etc');
        if (!ext_etc) {
            alert('WEBGL_compressed_texture_etc not available');
        }

        let ext_etc1 = gl.getExtension('WEBGL_compressed_texture_etc1');

        if (!ext_etc1) {
            alert('WEBGL_compressed_texture_etc1 not supported');
        }



        // Check if the extension is available
        let ext_astc = gl.getExtension('WEBGL_compressed_texture_astc');
        if (!ext_astc) {
            alert('WEBGL_compressed_texture_astc is not available');
        }

        const drawTexture = (canvas: HTMLCanvasElement, textureData: Texture_DATA) => {


            const level0 = textureData.levels[0];
            const {internalFormat, width, height} = level0;


            canvas.width = width;
            canvas.height = height;

            gl.viewport(0, 0, width, height);

            let texture = gl.createTexture();

            {

                let target = gl.TEXTURE_2D;
                gl.bindTexture(target, texture);

                {

                    const pixels = level0.pixels;
                    let imageWidth = Math.max(...pixels.map(data => data.xoffset + data.width));
                    let imageHeight= Math.max(...pixels.map(data => data.yoffset + data.height));
                    let compressed = level0.compressed;
                    console.log(`level0 internalFormat: ${internalFormat} ${findName(internalFormat, internalFormats_GLES2)}  ${internalFormat.toString(16)} width: ${width} height: ${height} compressed: ${compressed}`);
                    if(compressed){
                        
                    }
                    else {
                        gl.texImage2D(
                            target,
                            0,
                            gl.RGBA, // level0.internalFormat,
                            imageWidth,
                            imageHeight,
                            0,
                            pixels[0].format,
                            pixels[0].type,
                            null);
                    }

                    // pass data
                    pixels.forEach((data) => {

                        console.log('data', data)
                        console.log('data fromat', findName(data.format, formats_GLES2))
                        const pixelData = base64ToUint8Array(data.data)
                        if(compressed){
                            if(data.xoffset == 0 && data.yoffset == 0){
                                gl.compressedTexImage2D(
                                    target, 
                                    0,
                                    data.format,
                                    data.width, 
                                    data.height, 
                                    0,
                                    pixelData
                                );
                            }
                            else {
                                gl.compressedTexSubImage2D(
                                    target, 
                                    0,
                                    data.xoffset,
                                    data.yoffset,
                                    data.width, 
                                    data.height, 
                                    data.format,
                                    pixelData
                                );
                            }
                        }
                        else{
                                gl.texSubImage2D(
                                    target, 
                                    0,
                                    data.xoffset,
                                    data.yoffset,
                                    data.width, 
                                    data.height, 
                                    data.format == gl.RED ? gl.ALPHA8 : data.format,
                                    data.type || gl.UNSIGNED_BYTE, 
                                    pixelData);
                        }
                        
                    })
                }
            }

            // const pixelData = base64ToUint8Array(data.data)
            // target = data.target;
            drawTexture2DGL(gl, texture);

        }



    })

}

const appBins = async (appDiv : HTMLDivElement) => {
    var socket = io();
    socket.emit('get_bins');
    socket.on('bins', (bins: {
        width: number;
        height: number;
        format: number;
        pixels: Uint8Array,
    }[]) => {

        const div = document.createElement('div');

        // Create a download button
        const btn = document.createElement('button');
        btn.innerHTML = "Download all images";

        // Add click event listener to button
        btn.addEventListener('click', async () => {
            for(let index = 0; index < bins.length; index++){
                const bin = bins[index];
                const { width, height, pixels } = bin;
                if (width != 0 && height != 0) {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx : any = canvas.getContext('2d');
                    const imageData = ctx.createImageData(width, height);
                    imageData.data.set(new Uint8Array(pixels));
                    ctx.putImageData(imageData, 0, 0);

                    // Create a link element and trigger a download
                    let link = document.createElement('a');

                    const fn = `image${`00000000${index}`.slice(-8)}.png`;

                    link.download = fn
                    link.href = canvas.toDataURL();
                    link.click();

                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            };
        });

        div.appendChild(btn);


        bins.forEach((bin) => {

            const { width, height, format, pixels } = bin;

            console.log(`width: ${width} height: ${height} format: ${format} pixels: ${pixels.byteLength}`);
            // console.log(`pixels: ${new Uint8Array(pixels)}`);

            if (width != 0 && height != 0) {

                const img = document.createElement('img');
                img.width = width;
                img.height = height;

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx: any = canvas.getContext('2d');
                const imageData = ctx.createImageData(width, height);
                imageData.data.set(new Uint8Array(pixels));
                ctx.putImageData(imageData, 0, 0);

                img.src = canvas.toDataURL();
                div.appendChild(img);

                const p = document.createElement('p');
                p.innerHTML = `width: ${width}<br>height: ${height}<br>pixels: ${pixels.byteLength} bytes`;
                div.appendChild(p);
            }
        });

        appDiv.appendChild(div);


    })

}


const appDiv = document.getElementById('app') as HTMLDivElement;
if (appDiv) {

    const query = parse(location.search.substring(1));
    const fun = query?.f ?? "bins";

    switch (fun) {

        case "images": appImages(appDiv); break;
        case "bins": appBins(appDiv); break;
        case "texture2D": appTexture2D(appDiv); break;

        default:{
        const textDiv = document.createElement('div');
        textDiv.textContent = `This is a web page to view dumps from the Android GPU driver.

You can use the url query to specify which function to call.

eg.
http://localhost:3000/?f=images

available functions:

* images: display a list of images

and current function is ${fun}

        `;
        appDiv.appendChild(textDiv);

            break;
        }

    }


}

