
import { 
    HookFunAction,
    HookFunActionOptArgs, 
    hookDlopen, 
} from "./HookFunAction";

import { 
    HookAction,
} from "./HookAction";

import { 
    getAndroidAppInfo 
} from "./AndroidAPI";

import {
    DUMP_DATA,
    findName,
    bytesPerPixel_formats_GLES2,
    bytesPerPixel_types_GLES2,
    formats_GLES2,
    glTexImage2D_DATA,
    glTexSubImage2D_DATA,
    internalFormats_GLES2,
    Texture_DATA,
    targets_GLES2,
    types_GLES2,
    glCompreesdTexSubImage2D_DATA,
    glCompreesdTexImage2D_DATA,
    TEXTURES_TYPE,
} from "../src/utils"

import {
    INFO_TYPE,                                                                                                                               
    mod as libpatchgameinfo,
} from '../modinfos/libpatchgame'

let libPatchGame : INFO_TYPE | null = null;

interface CMD_DATA {
    cmd     : string,
    args   ?: string[],
};

const allCommands : CMD_DATA[] = [ ]

/**
 * Dump memory contents starting from a given address.
 * 
 * @param p The starting address of the memory to dump.
 * @param l The number of bytes to dump. If not provided, defaults to 32 bytes.
 */
const dumpMemory = (p: NativePointer, l: number = 0x20): void => {
    console.log(
        hexdump(p, {
            offset: 0,
            length: l,
            header: true,
            ansi: false,
        })
    );
};

const _frida_dummy = new NativeCallback(function(){

},'void',[]);

const _frida_log =  new NativeCallback(function(sp:NativePointer){
    console.log(sp.readUtf8String());
}, 'void', ['pointer']);

const _frida_err =  new NativeCallback(function(sp:NativePointer, exitApp:number){
    console.error(sp.readUtf8String());
    if(exitApp){
        throw 'err occured and exit';
        new NativeFunction(Module.getExportByName(null,'exit'),'int',['int'])(-9);
    }
    else{
        throw 'err occured';
    }
}, 'void', ['pointer','int']);

const _frida_hexdump =  new NativeCallback(function(sp:NativePointer, sz:number){
    dumpMemory(sp, sz);
}, 'void', ['pointer','uint']);

export const findFuns = (s:string, ignore_case?:boolean, libs?:string[]) =>{
    libs = libs || [];
    ignore_case = ignore_case || false;
    console.log('+ findFuns with ',s)
    const handleModule=(m:Module)=>{
        m.enumerateExports()
            .filter( e=>{
                if(ignore_case){ return e.name.toLowerCase().includes(s.toLowerCase()); }
                return e.name.includes(s)
            })
            .forEach(e=>{
                console.log('export',JSON.stringify([m,e]),e.address.sub(m.base))
            })
        m.enumerateSymbols()
            .filter(e=> {
                if(ignore_case){ return e.name.toLowerCase().includes(s.toLowerCase()); }
                return e.name.includes(s)
            })
            .forEach(e=>{
                console.log('symbol', JSON.stringify([m,e]),e.address.sub(m.base))
            })
        let e = m.findExportByName(s);
        if(e!=null){
            console.log('find export', JSON.stringify([m,e]),e.sub(m.base))
        }
    }
    if(libs.length>0){
        libs.forEach(lib=>{
            let m = Process.getModuleByName(lib);
            console.log('check', lib, 'and', m)
            if(m!=null) handleModule(m);
        })
    }
    else {
        Process.enumerateModules() .forEach(handleModule)
    }
    console.log('- findFuns with ',s);
}


function calculateDataLength(width: number, height: number, format: string, type: string): number {

    if (!bytesPerPixel_formats_GLES2[format]) {
        throw new Error(`Unsupported formatr ${format}`);
    }

    if (!bytesPerPixel_types_GLES2[type]) {
        throw new Error(`Unsupported type ${type}`);
    }

    // Calculate bytes per pixel
    const bytesPerPixel = bytesPerPixel_formats_GLES2[format];

    // Calculate bytes per type
    const bytesPerType = bytesPerPixel_types_GLES2[type];

    // Total data length in bytes
    const dataLength = width * height * bytesPerPixel * bytesPerType;

    return dataLength;
}

const base64Encode = (p:NativePointer, l: number=0x20): string => {

    if(libPatchGame){
        // console.log('base64Encode', p, l)
        const fun = new NativeFunction(libPatchGame.symbols.base64_encode,'int',['pointer','int','pointer','int']);
        const out_len = fun(p, l, ptr(0), 0);
        const buffer =  Memory.alloc(out_len+0x10);   
        fun(p, l, buffer, out_len);
        const s  = buffer.readUtf8String();
        if(s) return s;
    }

    throw new Error(`can not read string from buffer when encode base64`);
}

const writeJsonInfo = (fn:string, jsoninfo:DUMP_DATA) => {
    if (libPatchGame) {
        const ret = new NativeFunction(libPatchGame.symbols.writeTextFile, 'int', ['pointer', 'pointer'])(Memory.allocUtf8String(fn), Memory.allocUtf8String(JSON.stringify(jsoninfo)));
        if(ret<0){
            console.log(`write file ${fn} failed ${ret}`)
        }
        else{
            console.log(`write file ${fn} success`)
        }
    }
}


const patchGame = (info:{[key:string]:any}) => {
    const patchesForGL : {p:NativePointer, name?:string , opts:HookFunActionOptArgs} [] = [

{p:Module.getExportByName('libEGL.so',"eglCreateContext"     ) , name :"eglCreateContext"    , opts:{

    enterFun(args, tstr, thiz) {
        const ctx = thiz.args0;
        const config = thiz.args1;
        const draw = thiz.args2;
        const attrib = thiz.args3;

        dumpMemory(attrib, );
        attrib.add(0x04).writeU32(3)
    },
},  },

    ];
    [
        ... patchesForGL,
    ].forEach(t=>{
        console.log(`patch ${JSON.stringify(t)}`)
        let {p, name, opts} = t;
        name = name ?? p.toString();
        HookAction.addInstance(p, new HookFunAction({...opts, name}))
    })


}

let allTextures : TEXTURES_TYPE = {};
const hookGame = (info:{[key:string]:any}) => {

    const packageName   = info['app']       ?? 'com.Joymax.GreatMagician';
    const soname        = info['soname']    ?? 'libGLES_mali.so';

    const dumpDir = `/data/data/${packageName}/files/dumps`;
    let fileNo = 0;

    console.log(`dump directory: ${dumpDir}`);

    // rmdir(dumpDir);
    const system = new NativeFunction(Module.getExportByName(null, 'system'),'int',['pointer']);
    system(Memory.allocUtf8String(`rm -fr ${dumpDir} && mkdir -p ${dumpDir}`));

    const addNewTexture = (
        target:number, 
        id: number,
        level:number, 
        internalFormat:number, 
        width:number, 
        height:number, 
        border:number, 
        compressed:boolean,
        data?:string, 
        format?:number, 
        type?:number) => {

        if (target == targets_GLES2['GL_TEXTURE_2D']) {

            const texturesKey = `${id}`;

            let textureItem = allTextures[texturesKey];
            if (textureItem == undefined) {
                textureItem = allTextures[texturesKey] = {
                    type: "Texture2D",
                    levels: {},
                }
            }

            const currentTexture2DLevelInfo = Memory.alloc(0x20)
            if (libPatchGame) {
                const ret = new NativeFunction(libPatchGame.symbols.getCurrentTexture2DInfo, 'int', ['pointer', 'int'])(currentTexture2DLevelInfo, level);
                if (ret < 0) {
                    console.log(`getCurrentTexture2DInfo with ${level} failed ${ret}`)
                    return;
                }
            }
            const currentTexture2DLevelWidth             = currentTexture2DLevelInfo.add(4 * 0).readS32();
            const currentTexture2DLevelHeight            = currentTexture2DLevelInfo.add(4 * 1).readS32();
            const currentTexture2DLevelInternalFormat    = currentTexture2DLevelInfo.add(4 * 2).readS32();
            const currentTexture2DLevelIsCompressed      = currentTexture2DLevelInfo.add(4 * 3).readS32();

            const levelsKey = `${level}`;
            let levelItem = textureItem.levels[levelsKey];
            if (levelItem == undefined) {
                levelItem = textureItem.levels[levelsKey] = {
                    width           : currentTexture2DLevelWidth,
                    height          : currentTexture2DLevelHeight,
                    internalFormat  : currentTexture2DLevelInternalFormat,
                    compressed      : !!currentTexture2DLevelIsCompressed,
                    pixels: [],
                };
            }

            if (data && format ) {
                textureItem.levels[levelsKey].pixels = [{
                    width, 
                    height,
                    xoffset: 0, 
                    yoffset: 0,
                    format, 
                    type,
                    data,
                }]
            }
        }
    };

    const addSubData = (
        target:number, 
        id : number,
        level:number, 
        xoffset:number, 
        yoffset:number, 
        width:number, 
        height:number, 
        compressed:boolean,
        data?:string, 
        format?:number, 
        type?:number
    ) => {

        if (target == targets_GLES2['GL_TEXTURE_2D'] && id != 0) {

            if (data && format) {

                const texturesKey = `${id}`;

                let textureItem = allTextures[texturesKey];
                if (textureItem == undefined) {
                    textureItem = allTextures[texturesKey] = {
                        type: "Texture2D",
                        levels: {},
                    }
                }

                const currentTexture2DLevelInfo = Memory.alloc(0x20)
                if (libPatchGame) {
                    const ret = new NativeFunction(libPatchGame.symbols.getCurrentTexture2DInfo, 'int', ['pointer', 'int'])(currentTexture2DLevelInfo, level);
                    if (ret < 0) {
                        console.log(`getCurrentTexture2DInfo with ${level} failed ${ret}`)
                        return;
                    }
                }
                const currentTexture2DLevelWidth             = currentTexture2DLevelInfo.add(4 * 0).readS32();
                const currentTexture2DLevelHeight            = currentTexture2DLevelInfo.add(4 * 1).readS32();
                const currentTexture2DLevelInternalFormat    = currentTexture2DLevelInfo.add(4 * 2).readS32();
                const currentTexture2DLevelIsCompressed      = currentTexture2DLevelInfo.add(4 * 3).readS32();

                const levelsKey = `${level}`
                let levelItem = textureItem.levels[levelsKey];
                if (levelItem == undefined) {
                    levelItem = textureItem.levels[levelsKey] = {
                        width: currentTexture2DLevelWidth,
                        height: currentTexture2DLevelHeight,
                        internalFormat: currentTexture2DLevelInternalFormat,
                        compressed: !!currentTexture2DLevelIsCompressed,
                        pixels: [],
                    }
                }

                textureItem.levels[levelsKey].pixels.push({
                    width, 
                    height,
                    xoffset, 
                    yoffset,
                    data,
                    format,
                    type,
                })

            }
        }
    }

    let currentBindingTexture2DId = 0;

    const hooksForTexture2D : {p:NativePointer, name?:string , opts:HookFunActionOptArgs} [] = [

{p:Module.getExportByName(soname,"glBindTexture"     ) , name :"glBindTexture"    , opts:{
    // void glBindTexture(	GLenum target,
    //     GLuint texture);
    hide:true,
    enterFun(args, tstr, thiz) {
        const target  = thiz.args0.toUInt32();
        const texture = thiz.args1.toUInt32();
        if(target == targets_GLES2['GL_TEXTURE_2D']){
            currentBindingTexture2DId = texture;
        }
    },
},},

{p:Module.getExportByName(soname,"glCompressedTexImage2D"     ) , name :"glCompressedTexImage2D"    , opts:{

    nparas:9,
    hide:true,

    // void glCompressedTexImage2D(	GLenum target,
    //     GLint level,
    //     GLenum internalformat,
    //     GLsizei width,
    //     GLsizei height,
    //     GLint border,
    //     GLsizei imageSize,
    //     const GLvoid * data);
    enterFun(args, tstr, thiz) {
        const target             = thiz.args0.toUInt32();
        const level              = thiz.args1.toUInt32();
        const internalFormat     = thiz.args2.toUInt32();
        const width              = thiz.args3.toUInt32();
        const height             = thiz.args4.toUInt32();
        const border             = thiz.args5.toUInt32();
        const dataLength         = thiz.args6.toUInt32();
        const data               = thiz.args7;

        const pixData            = !data.isNull() ? base64Encode(data, dataLength) : undefined;
        console.log(tstr, `glCompressedTexImage2D( ${target} , ${level} , ${internalFormat} , ${width} , ${height} , ${border}, ${data})  pixData: ${pixData ? pixData.length : undefined}  textureId: ${currentBindingTexture2DId}`);

        const currentTexture2DId = (libPatchGame) 
            ? new NativeFunction(libPatchGame.symbols.getCurrentTexture2DId, 'int', [])() 
            : 0;
        if(currentTexture2DId <= 0){
            console.log(`currentTexture2DId(${currentTexture2DId}) <= 0`);
            return ;
        }


        addNewTexture(target, currentTexture2DId, level, internalFormat, width, height, border, true, pixData, );

        if (1) {
            const fn = `${dumpDir}/${('00000000' + fileNo).slice(-8)}.json`;
            if (pixData) {
                const dumpdata: glCompreesdTexImage2D_DATA = {
                    target,
                    level,
                    internalFormat,
                    width,
                    height,
                    border,
                    data: pixData,
                }

                writeJsonInfo(fn, {
                    function: "glCompressedTexImage2D",
                    data: dumpdata,
                    textureId: currentTexture2DId,
                }); 
                fileNo++;
            }
        }
        
    },

}, }, 


{p:Module.getExportByName(soname,"glCompressedTexSubImage2D"  ) , name :"glCompressedTexSubImage2D" , opts:{
    nparas:9,
    hide:true,
    // void glCompressedTexSubImage2D(	GLenum target,
    //     GLint level,
    //     GLint xoffset,
    //     GLint yoffset,
    //     GLsizei width,
    //     GLsizei height,
    //     GLenum format,
    //     GLsizei imageSize,
    //     const GLvoid * data);
    enterFun(args, tstr, thiz) {
        const target             = thiz.args0.toUInt32();
        const level              = thiz.args1.toUInt32();
        const xoffset            = thiz.args2.toUInt32();
        const yoffset            = thiz.args3.toUInt32();
        const width              = thiz.args4.toUInt32();
        const height             = thiz.args5.toUInt32();
        const format             = thiz.args6.toUInt32();
        const dataLength         = thiz.args7.toUInt32();
        const data               = thiz.args8;

        const pixData            = (!data.isNull() && dataLength>0) ? base64Encode(data, dataLength) : undefined;
        console.log(tstr, `glCompressedTexSubImage2D( ${target} , ${level} , ${xoffset} , ${yoffset}, ${width} , ${height} , ${format} , ${data}) pixData ${pixData? pixData.length : undefined}  textureId: ${currentBindingTexture2DId}`);

        const currentTexture2DId = (libPatchGame) 
            ? new NativeFunction(libPatchGame.symbols.getCurrentTexture2DId, 'int', [])() 
            : 0;
        if(currentTexture2DId <= 0){
            console.log(`currentTexture2DId(${currentTexture2DId}) <= 0`);
            return ;
        }


        addSubData(target, currentTexture2DId, level, xoffset, yoffset, width, height, true, pixData, format, );


        if (1) {

            const fn = `${dumpDir}/${('00000000' + fileNo).slice(-8)}.json`;
            if (pixData) {
                const dumpdata: glCompreesdTexSubImage2D_DATA = {
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    data: pixData,

                };
                writeJsonInfo(fn, {
                    function: "glCompressedTexSubImage2D",
                    data: dumpdata,
                    textureId: currentTexture2DId,
                }); 
                fileNo++;

            }
        }

    },
}, }, 


{p:Module.getExportByName(soname,"glTexImage2D"     ) , name :"glTexImage2D"    , opts:{
    nparas:9,
    // void glTexImage2D(	GLenum target,
    //     GLint level,
    //     GLint internalFormat,
    //     GLsizei width,
    //     GLsizei height,
    //     GLint border,
    //     GLenum format,
    //     GLenum type,
    //     const GLvoid * data);
    hide:false,
    enterFun(args, tstr, thiz) {
        const target           :number  = thiz.args0.toUInt32();
        const level            :number  = thiz.args1.toUInt32();
        const internalFormat   :number  = thiz.args2.toUInt32();
        const width            :number  = thiz.args3.toUInt32();
        const height           :number  = thiz.args4.toUInt32();
        const border           :number  = thiz.args5.toUInt32();
        const format           :number  = thiz.args6.toUInt32();
        const type             :number  = thiz.args7.toUInt32();
        const data             :NativePointer  = thiz.args8;
        const dataLength         = calculateDataLength(
            width, 
            height, 
            findName(format, formats_GLES2),
            findName(type, types_GLES2),
        )
        const pixData = data.isNull() ? undefined : base64Encode(data, dataLength);

        console.log(tstr, `glTexImage2D( ${target} , ${level} , ${internalFormat} , ${width} , ${height} , ${border} , ${format} , ${type} , ${data}) pixData : ${pixData? pixData.length : undefined}  textureId: ${currentBindingTexture2DId}`);

        const currentTexture2DId = (libPatchGame) 
            ? new NativeFunction(libPatchGame.symbols.getCurrentTexture2DId, 'int', [])() 
            : 0;
        if(currentTexture2DId <= 0){
            console.log(`currentTexture2DId(${currentTexture2DId}) <= 0`);
            return ;
        }


        addNewTexture(target, currentTexture2DId, level, internalFormat, width, height, border, false, pixData, format, type);

        if (1) {
            if (pixData) {
                const fn = `${dumpDir}/${('00000000' + fileNo).slice(-8)}.json`;
                const dumpdata: glTexImage2D_DATA = {
                    target,
                    level,
                    internalFormat,
                    width,
                    height,
                    border,
                    format,
                    type,
                    data: pixData,
                }

                writeJsonInfo(fn, {
                    function: "glTexImage2D",
                    data: dumpdata,
                    textureId: currentTexture2DId,
                }); 
                fileNo++;

            }
        }

    },
}, }, 


{p:Module.getExportByName(soname,"glTexSubImage2D"  ) , name :"glTexSubImage2D" , opts:{
    //void glTexSubImage2D(	GLenum target,
    //    GLint level,
    //    GLint xoffset,
    //    GLint yoffset,
    //    GLsizei width,
    //    GLsizei height,
    //    GLenum format,
    //    GLenum type,
    //    const GLvoid * data);
    nparas:9,
    hide:true,

    enterFun(args, tstr, thiz) {
        const target  :number           = thiz.args0.toUInt32();
        const level   :number           = thiz.args1.toUInt32();
        const xoffset :number           = thiz.args2.toUInt32();
        const yoffset :number           = thiz.args3.toUInt32();
        const width   :number           = thiz.args4.toUInt32();
        const height  :number           = thiz.args5.toUInt32();
        const format  :number           = thiz.args6.toUInt32();
        const type    :number           = thiz.args7.toUInt32();
        const data    :NativePointer    = thiz.args8;
        const dataLength :number        = calculateDataLength(
            width, 
            height, 
            findName(format,    formats_GLES2), 
            findName(type,      types_GLES2),
        )

        const pixData = data.isNull() ? undefined : base64Encode(data, dataLength);

        console.log(tstr, `glTexSubImage2D( ${target} , ${level} , ${xoffset} , ${yoffset}, ${width} , ${height} , ${format} , ${type} , ${data}) pixData : ${pixData? pixData.length : undefined} textureId: ${currentBindingTexture2DId} `);

        const currentTexture2DId = (libPatchGame) 
            ? new NativeFunction(libPatchGame.symbols.getCurrentTexture2DId, 'int', [])() 
            : 0;
        if(currentTexture2DId <= 0){
            console.log(`currentTexture2DId(${currentTexture2DId}) <= 0`);
            return ;
        }


        addSubData(target, currentTexture2DId, level, xoffset, yoffset, width, height,false, pixData, format, type);


        if (1) {

            if (pixData) {
                const fn = `${dumpDir}/${('00000000' + fileNo).slice(-8)}.json`;
                const dumpdata: glTexSubImage2D_DATA = {
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    type,
                    data: pixData,
                }
                console.log(`write ${fn}`);

                writeJsonInfo(fn, {
                    function: "glTexSubImage2D",
                    data: dumpdata,
                    textureId: currentTexture2DId,
                }); 
                fileNo++;

            }
        }

    },

}, }, 

{p:Module.getExportByName(soname,"glTexSubImage3D"  ) , name :"glTexSubImage3D" , opts:{}, }, 
{p:Module.getExportByName(soname,"glTexImage3D"     ) , name :"glTexImage3D"    , opts:{}, }, 
{p:Module.getExportByName(soname,"glCompressedTexSubImage3D"  ) , name :"glCompressedTexSubImage3D" , opts:{}, }, 
{p:Module.getExportByName(soname,"glCompressedTexImage3D"     ) , name :"glCompressedTexImage3D"    , opts:{}, }, 

    ];

    const hooksForEGL : {p:NativePointer, name?:string , opts:HookFunActionOptArgs} [] = [

{p:Module.getExportByName('libEGL.so',"eglSwapBuffers"     ) , name :"eglSwapBuffers"    , opts:{
    hide:true,
    enterFun(args, tstr, thiz) {
        {
            const command = allCommands.length>0 ? allCommands[allCommands.length - 1] : undefined;
            if(allCommands.length>0)allCommands.pop();
            if(command){
                const {cmd} = command;
                switch(cmd){
                    case "dumpAllTexture2Ds": {
                        if (libPatchGame) {
                            const m = Process.getModuleByName(soname);
                            new NativeFunction(libPatchGame.symbols.dumpAllTexture2Ds, 'int', ['pointer', 'pointer'])(
                                m.base,
                                Memory.allocUtf8String(dumpDir),
                            );
                        }
                    } break;
                }
            }
        }
        if(0)
        {
            if (libPatchGame) {
                const m = Process.getModuleByName(soname);
                new NativeFunction(libPatchGame.symbols.hookOpenGL, 'int', ['pointer', 'pointer'])(
                    m.base,
                    Memory.allocUtf8String(dumpDir),
                );
            }
        }
    },
},},

    ];

    [
        ... hooksForEGL,
        ... hooksForTexture2D,
    ].forEach((t:{
        p: NativePointer;
        name?: string ;
        opts: HookFunActionOptArgs;
    })=>{
        console.log(`hook ${JSON.stringify(t)}`)
        let {p, name, opts} = t;
        name = name ?? p.toString();
        HookAction.addInstance(p, new HookFunAction({...opts, name}))
    })


    
}

const testGame = (info:{[key:string]:any}) => {


    {
        // get the version of zlib
        const m = Process.getModuleByName('libz.so')
        m.enumerateExports()
            .filter(s=>s.name.includes('zlibVersion'))
            .forEach(s=>{
                console.log(`symbol ${s}, ${JSON.stringify(s)}`)
            })
        const fun =  new NativeFunction(Module.getExportByName('libz.so','zlibVersion'), 'pointer',[]);
        console.log('zlib version', fun().readUtf8String());
    }

    {
        // get the version of libssl
        const m = Process.getModuleByName('libssl.so')
        console.log(`module: ${m} ${JSON.stringify(m)}`)
        m.enumerateExports()
            .filter(s=>s.name.includes('version'))
            .forEach(s=>{
                console.log(`symbol : ${s} ${JSON.stringify(s)}`)
            })
    }

    
}

const handleSo=(info:{[key:string]:any})=>{

    patchGame   (info);
    hookGame    (info);
    testGame    (info);

}

const loadPatchlib = (info:{[key:string]:any})=> {

    const packageName   = info['app']       ?? 'com.Joymax.GreatMagician';
    const soname        = info['soname']    ?? 'libGLES_mali.so';

    const dumpDir = `/data/data/${packageName}/files/dumps`;

    if(libPatchGame==null) {
        {
            Module.load('/data/local/tmp/libz.so.1')
            Module.load('/data/local/tmp/libcrypto.so.3')
            Module.load('/data/local/tmp/libssl.so.3')
            Module.load('/data/local/tmp/libnghttp3.so')
            Module.load('/data/local/tmp/libnghttp2.so')
            Module.load('/data/local/tmp/libnghttp3.so')
            Module.load('/data/local/tmp/libnghttp2.so')
            Module.load('/data/local/tmp/libssh2.so')
            Module.load('/data/local/tmp/libcurl.so')
        }
        libPatchGame = libpatchgameinfo.load(
            '/data/local/tmp/libpatchgame.so',
            [
                'libcurl.so',
            ],
            {
                _frida_dummy,
                _frida_log,
                _frida_err,
                _frida_hexdump,

            },
        )
        {
            const m = Process.getModuleByName(soname);
            new NativeFunction(libPatchGame.symbols.init,'int',['pointer', 'pointer'])(
                m.base,
                Memory.allocUtf8String(dumpDir),
            );
        }
    }

}

const test = (info:{[key:string]:any})=>{

    loadPatchlib(info);

    const soname        = info['soname']    ?? 'libGLES_mali.so';

    const m = Process.findModuleByName(soname);
    if (m) {
        handleSo(info)
    }
    else {
        hookDlopen(soname, ()=>{
            handleSo(info)

        })
    }

}

let info : {[key:string]:any} = {
    
}

rpc.exports = {
    init:function(...paras:any){
        const [stage] = paras;
        [info] = paras;
        console.log(`${stage} ${JSON.stringify(info)}`)
        console.log('##################################################')
        Java.perform(()=>{
            test(info)
        })
    }
}


declare global {                                                                                                                            
    var helloWorld: () => void;                                                                                                             
    var d: () => void;     // dump all texture2Ds                                                                                                        
    var p: () => void;     // print all texture2Ds                                                                                                        
    var dumpAllTexture2Ds: () => void;     // do some tests;
}    

globalThis.helloWorld = () => {                                                                                                             
    console.log('Hello, World!');                                                                                                           
};                                                                                                                                          
      
globalThis.d= ()  => {
    console.log('texture2d count', Object.keys(allTextures).length)
    const packageName   = info['app']       ?? 'com.Joymax.GreatMagician';
    const soname        = info['soname']    ?? 'libGLES_mali.so';

    const fn            = `/data/data/${packageName}/files/Texture2D.json`;

    console.log('write file', fn)
    if (libPatchGame) {
        const ret = new NativeFunction(libPatchGame.symbols.writeTextFile, 'int', ['pointer', 'pointer'])(
            Memory.allocUtf8String(fn), 
            Memory.allocUtf8String(JSON.stringify(allTextures))
        );
        if (ret < 0) {
            console.log(`write file ${fn} failed ${ret}`)
        }
    }

}                                                                                                            

globalThis.p= ()  => {
    console.log('texture2d count', Object.keys(allTextures).length)
}                                                                                                            

globalThis.dumpAllTexture2Ds= ()  => {

    allCommands.push({
        cmd: 'dumpAllTexture2Ds',
    })
}