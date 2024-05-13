
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
    bytesPerPixel_formats_GLES2,
    bytesPerPixel_types_GLES2,
    formats_GLES2,
    glTexImage2D_DATA,
    internalFormats_GLES2,
    targets_GLES2,
    types_GLES2,
} from "../src/utils"

import {
    INFO_TYPE,                                                                                                                               
    mod as libpatchgameinfo,
} from '../modinfos/libpatchgame'

let libPatchGame : INFO_TYPE | null = null;

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


const findName = (n:number, names: {[key:string]:number}):string => {
    return Object.keys(names).find(k => names[k] == n) || `unknow 0x${n.toString(16).toUpperCase()}`;
}

function calculateBase64Length(bufferLength: number): number {
    // Calculate the length of the resultant Base64 string
    // Every 3 bytes of the input buffer convert to 4 bytes of Base64 characters
    const base64Length = Math.ceil(bufferLength / 3) * 4;
    return base64Length+4;
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

function convertByteArrayToBase64(bs: ArrayBuffer): string {

    // Convert the ArrayBuffer to a binary string
    const binaryString = Array.from(new Uint8Array(bs), byte => String.fromCharCode(byte)).join('');

    // Encode the binary string to Base64
    const base64String = btoa(binaryString);
    return base64String;
}

const cm = new CModule (`

static const char base64_table[] = 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";


void* fopen(const char*, const char*);
void* fprintf(void*, void*, void*);
int fclose(void*);
int writeTextFile(const char* filename, char* context){
    void* fp = fopen(filename, "w");
    if (fp == (void*)0) {
        return -1;
    }
    fprintf(fp, "%s", context);
    fclose(fp);
    return 0;
}

int base64_encode(const unsigned char *in, int in_len, char *out, int out_len) {
    int i, j;
    int enc_len = 4 * ((in_len + 2) / 3); // Base64 string length

    if (out_len < enc_len + 1) { // Check if the output buffer is big enough
        return -1; // Not enough space
    }

    for (i = 0, j = 0; i < in_len;) {
        unsigned int octet_a = i < in_len ? (unsigned char)in[i++] : 0;
        unsigned int octet_b = i < in_len ? (unsigned char)in[i++] : 0;
        unsigned int octet_c = i < in_len ? (unsigned char)in[i++] : 0;

        unsigned int triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

        out[j++] = base64_table[(triple >> 3 * 6) & 0x3F];
        out[j++] = base64_table[(triple >> 2 * 6) & 0x3F];
        out[j++] = base64_table[(triple >> 1 * 6) & 0x3F];
        out[j++] = base64_table[(triple >> 0 * 6) & 0x3F];
    }

    for (i = 0; i < enc_len - j; i++) {
        out[enc_len - 1 - i] = '='; // Add padding
    }
    out[enc_len] = '0'; // Null-terminate the string

    return enc_len; // Return the length of the Base64 encoded string
}

`, {
    fopen  : Module.getExportByName(null,'fopen'),
    fclose : Module.getExportByName(null,'fclose'),
    fprintf: Module.getExportByName(null,'fprintf'),
})

const base64Encode = (p:NativePointer, l: number=0x20): string => {
    const out_len = calculateBase64Length(l)
    const buffer =  Memory.alloc(out_len);   
    const ret = new NativeFunction(cm.base64_encode,'pointer',['pointer','int','pointer','int'])(p, l, buffer, out_len);
    const s  = buffer.readUtf8String();
    if(s) return s;
    throw new Error(`can not read string from buffer when encode base64`);
}



const patchGame = (info:{[key:string]:any}) => {
}

const hookGame = (info:{[key:string]:any}) => {

    const packageName   = info['app']       ?? 'com.Joymax.GreatMagician';
    const soname        = info['soname']    ?? 'libGLES_mali.so';

    const dumpDir = `/data/data/${packageName}/files/dumps`;
    let fileNo = 0;

    console.log(`dump directory: ${dumpDir}`);

    // rmdir(dumpDir);
    const system = new NativeFunction(Module.getExportByName(null, 'system'),'int',['pointer']);
    system(Memory.allocUtf8String(`rm -fr ${dumpDir} && mkdir -p ${dumpDir}`));

    const hooksForTexture2D : {p:NativePointer, name?:string , opts:HookFunActionOptArgs} [] = [

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
        const target             = findName(thiz.args0.toUInt32(),targets_GLES2);
        const level              = thiz.args1.toUInt32();
        const internalFormat     = findName(thiz.args2.toUInt32(),internalFormats_GLES2);
        const width              = thiz.args3.toUInt32();
        const height             = thiz.args4.toUInt32();
        const border             = thiz.args4.toUInt32();
        const format             = findName(thiz.args6.toUInt32(),formats_GLES2);
        const dataLength         = thiz.args4.toUInt32();
        const data               = thiz.args8;

        if(!data.isNull()){
            const fn = `${dumpDir}/${('00000000' + fileNo).slice(-8)}.json`;
            console.log(tstr, `glCompressedTexImage2D( ${target} , ${level} , ${internalFormat} , ${width} , ${height} , ${border},  ${format} , ${data}) dataLength ${dataLength} => ${fn}`);
            fileNo++;
            const jsoninfo : DUMP_DATA = {
                function:"glCompressedTexSubImage2D",
                data: {
                    target,
                    level,
                    internalFormat,
                    width,
                    height,
                    border,
                    format,
                    data: base64Encode(data, dataLength),
                }
            }

            const ret = new NativeFunction(cm.writeTextFile, 'int', ['pointer','pointer'])(Memory.allocUtf8String(fn), Memory.allocUtf8String(JSON.stringify(jsoninfo)));
        }


        
    },

}, }, 

{p:Module.getExportByName(soname,"glCompressedTexImage3D"     ) , name :"glCompressedTexImage3D"    , opts:{}, }, 

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
        const target             = findName(thiz.args0.toUInt32(),targets_GLES2);
        const level              = thiz.args1.toUInt32();
        const xoffset            = thiz.args3.toUInt32();
        const yoffset            = thiz.args3.toUInt32();
        const width              = thiz.args3.toUInt32();
        const height             = thiz.args4.toUInt32();
        const format             = findName(thiz.args6.toUInt32(),formats_GLES2);
        const dataLength         = thiz.args4.toUInt32();
        const data               = thiz.args8;

        if(!data.isNull()){
            const fn = `${dumpDir}/${('00000000' + fileNo).slice(-8)}.json`;
            console.log(tstr, `glCompressedTexSubImage2D( ${target} , ${level} , ${xoffset} , ${yoffset}, ${width} , ${height} , ${format} , ${data}) dataLength ${dataLength} => ${fn}`);
            fileNo++;
            const jsoninfo : DUMP_DATA = {
                function:"glCompressedTexSubImage2D",
                data: {
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    data: base64Encode(data, dataLength),
                }
            }

            const ret = new NativeFunction(cm.writeTextFile, 'int', ['pointer','pointer'])(Memory.allocUtf8String(fn), Memory.allocUtf8String(JSON.stringify(jsoninfo)));
        }

    },
}, }, 

{p:Module.getExportByName(soname,"glCompressedTexSubImage3D"  ) , name :"glCompressedTexSubImage3D" , opts:{}, }, 

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
    hide:true,
    enterFun(args, tstr, thiz) {
        const target             = findName(thiz.args0.toUInt32(),targets_GLES2);
        const level              = thiz.args1.toUInt32();
        const internalFormat     = findName(thiz.args2.toUInt32(),internalFormats_GLES2);
        const width              = thiz.args3.toUInt32();
        const height             = thiz.args4.toUInt32();
        const border             = thiz.args5.toUInt32();
        const format             = findName(thiz.args6.toUInt32(),formats_GLES2);
        const type               = findName(thiz.args7.toUInt32(),types_GLES2);
        const data               = thiz.args8;
        const dataLength         = calculateDataLength(width, height, format, type)

        if(!data.isNull()){
            const fn = `${dumpDir}/${('00000000' + fileNo).slice(-8)}.json`;
            console.log(tstr, `glTexImage2D( ${target} , ${level} , ${internalFormat} , ${width} , ${height} , ${border} , ${format} , ${type} , ${data}) dataLength ${dataLength} => ${fn}`);
            fileNo++;
            const jsoninfo : DUMP_DATA = {
                function:"glTexImage2D",
                data: {
                    target,
                    level,
                    internalFormat,
                    width,
                    height,
                    border,
                    format,
                    type,
                    data: base64Encode(data, dataLength),
                }
            }

            const ret = new NativeFunction(cm.writeTextFile, 'int', ['pointer','pointer'])(Memory.allocUtf8String(fn), Memory.allocUtf8String(JSON.stringify(jsoninfo)));
        }

    },
}, }, 

{p:Module.getExportByName(soname,"glTexImage3D"     ) , name :"glTexImage3D"    , opts:{}, }, 

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
        const target             = findName(thiz.args0.toUInt32(),targets_GLES2);
        const level              = thiz.args1.toUInt32();
        const xoffset            = thiz.args2.toUInt32();
        const yoffset            = thiz.args3.toUInt32();
        const width              = thiz.args4.toUInt32();
        const height             = thiz.args5.toUInt32();
        const format             = findName(thiz.args6.toUInt32(),formats_GLES2);
        const type               = findName(thiz.args7.toUInt32(),types_GLES2);
        const data               = thiz.args8;
        const dataLength         = calculateDataLength(width, height, format, type)

        if(!data.isNull()){
            const fn = `${dumpDir}/${('00000000' + fileNo).slice(-8)}.json`;
            console.log(tstr, `glTexSubImage2D( ${target} , ${level} , ${xoffset} , ${yoffset}, ${width} , ${height} , ${format} , ${type} , ${data}) dataLength ${dataLength} => ${fn}`);
            fileNo++;
            const jsoninfo : DUMP_DATA = {
                function:"glTexSubImage2D",
                data: {
                    target,
                    level,
                    xoffset,
                    yoffset,
                    width,
                    height,
                    format,
                    type,
                    data: base64Encode(data, dataLength),
                }
            }

            const ret = new NativeFunction(cm.writeTextFile, 'int', ['pointer','pointer'])(Memory.allocUtf8String(fn), Memory.allocUtf8String(JSON.stringify(jsoninfo)));
        }

    },

}, }, 

{p:Module.getExportByName(soname,"glTexSubImage3D"  ) , name :"glTexSubImage3D" , opts:{}, }, 

    ];

    [
        ... hooksForTexture2D
    ].forEach(t=>{
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


    loadPatchlib(info);

}


rpc.exports = {
    init:function(...paras:any){
        const [stage, info]  = paras;
        console.log(`${stage} ${JSON.stringify(info)}`)
        console.log('##################################################')
        Java.perform(()=>{
            test(info)
        })
    }
}
