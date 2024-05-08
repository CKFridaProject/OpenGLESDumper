
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
    glTexImage2D_DATA,
} from "../src/utils"

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
const types_GLES2: {[key:string]:number} = {
    GL_UNSIGNED_BYTE                        : 0x1401,
    GL_BYTE                                 : 0x1400,
    GL_UNSIGNED_SHORT                       : 0x1403,
    GL_SHORT                                : 0x1402,
    GL_UNSIGNED_INT                         : 0x1405,
    GL_INT                                  : 0x1404,
    GL_HALF_FLOAT                           : 0x140B,
    GL_FLOAT                                : 0x1406,
    GL_UNSIGNED_SHORT_5_6_5                 : 0x8363,
    GL_UNSIGNED_SHORT_4_4_4_4               : 0x8033,
    GL_UNSIGNED_SHORT_5_5_5_1               : 0x8034,
    GL_UNSIGNED_INT_2_10_10_10_REV          : 0x8368,
    GL_UNSIGNED_INT_10F_11F_11F_REV         : 0x8C3B,
    GL_UNSIGNED_INT_5_9_9_9_REV             : 0x8C3E,
    GL_UNSIGNED_INT_24_8                    : 0x84FA,
    GL_FLOAT_32_UNSIGNED_INT_24_8_REV       : 0x8DAD,
}

const bytesPerPixel_types_GLES2: {[key:string]:number} = {
    GL_UNSIGNED_BYTE                        : 1,
    GL_BYTE                                 : 1,
    GL_UNSIGNED_SHORT                       : 2,
    GL_SHORT                                : 2,
    GL_UNSIGNED_INT                         : 4,
    GL_INT                                  : 4,
    GL_HALF_FLOAT                           : 2,
    GL_FLOAT                                : 4,
    GL_UNSIGNED_SHORT_5_6_5                 : 2,
    GL_UNSIGNED_SHORT_4_4_4_4               : 2,
    GL_UNSIGNED_SHORT_5_5_5_1               : 2,
    GL_UNSIGNED_INT_2_10_10_10_REV          : 4,
    GL_UNSIGNED_INT_10F_11F_11F_REV         : 4,
    GL_UNSIGNED_INT_5_9_9_9_REV             : 4,
    GL_UNSIGNED_INT_24_8                    : 4,
    GL_FLOAT_32_UNSIGNED_INT_24_8_REV       : 8,
}



const internalFormats_GLES2: { [key: string]: number } = {
    GL_RGB                                        : 0x1907,
    GL_RGBA                                       : 0x1908,
    GL_LUMINANCE_ALPHA                            : 0x190A,
    GL_LUMINANCE                                  : 0x1909,
    GL_ALPHA                                      : 0x1906,
    GL_R8                                         : 0x8229,
    GL_R8_SNORM                                   : 0x8F94,
    GL_R16F                                       : 0x822D,
    GL_R32F                                       : 0x822E,
    GL_R8UI                                       : 0x8232,
    GL_R8I                                        : 0x8231,
    GL_R16UI                                      : 0x8234,
    GL_R16I                                       : 0x8233,
    GL_R32UI                                      : 0x8236,
    GL_R32I                                       : 0x8235,
    GL_RG8                                        : 0x822B,
    GL_RG8_SNORM                                  : 0x8F95,
    GL_RG16F                                      : 0x822F,
    GL_RG32F                                      : 0x8230,
    GL_RG8UI                                      : 0x8238,
    GL_RG8I                                       : 0x8237,
    GL_RG16UI                                     : 0x823A,
    GL_RG16I                                      : 0x8239,
    GL_RG32UI                                     : 0x823C,
    GL_RG32I                                      : 0x823B,
    GL_RGB8                                       : 0x8051,
    GL_SRGB8                                      : 0x8C41,
    GL_RGB565                                     : 0x8D62,
    GL_RGB8_SNORM                                 : 0x8F96,
    GL_R11F_G11F_B10F                             : 0x8C3A,
    GL_RGB9_E5                                    : 0x8C3D,
    GL_RGB16F                                     : 0x881B,
    GL_RGB32F                                     : 0x8815,
    GL_RGB8UI                                     : 0x8D7D,
    GL_RGB8I                                      : 0x8D8F,
    GL_RGB16UI                                    : 0x8D77,
    GL_RGB16I                                     : 0x8D89,
    GL_RGB32UI                                    : 0x8D73,
    GL_RGB32I                                     : 0x8D83,
    GL_RGBA8                                      : 0x8058,
    GL_SRGB8_ALPHA8                               : 0x8C43,
    GL_RGBA8_SNORM                                : 0x8F97,
    GL_RGB5_A1                                    : 0x8057,
    GL_RGBA4                                      : 0x8056,
    GL_RGB10_A2                                   : 0x8059,
    GL_RGBA16F                                    : 0x881A,
    GL_RGBA32F                                    : 0x8814,
    GL_RGBA8UI                                    : 0x8D7C,
    GL_RGBA8I                                     : 0x8D8E,
    GL_RGB10_A2UI                                 : 0x906F,
    GL_RGBA16UI                                   : 0x8D76,
    GL_RGBA16I                                    : 0x8D88,
    GL_RGBA32I                                    : 0x8D82,
    GL_RGBA32UI                                   : 0x8D70,
    GL_DEPTH_COMPONENT16                          : 0x81A5,
    GL_DEPTH_COMPONENT24                          : 0x81A6,
    GL_DEPTH_COMPONENT32F                         : 0x8CAC,
    GL_DEPTH24_STENCIL8                           : 0x88F0,
    GL_DEPTH32F_STENCIL8                          : 0x8CAD,
};


const targets_GLES2: { [key: string]: number } = {
    GL_TEXTURE_2D                   : 0x0DE1,
    GL_TEXTURE_CUBE_MAP_POSITIVE_X  : 0x8515,
    GL_TEXTURE_CUBE_MAP_NEGATIVE_X  : 0x8516,
    GL_TEXTURE_CUBE_MAP_POSITIVE_Y  : 0x8517,
    GL_TEXTURE_CUBE_MAP_NEGATIVE_Y  : 0x8518,
    GL_TEXTURE_CUBE_MAP_POSITIVE_Z  : 0x8519,
    GL_TEXTURE_CUBE_MAP_NEGATIVE_Z  : 0x851A,
};

const formats_GLES2: {[key:string]:number} = {
    GL_RED                        : 0x1903,
    GL_RED_INTEGER                : 0x8D94,
    GL_RG                         : 0x8227,
    GL_RG_INTEGER                 : 0x8228,
    GL_RGB                        : 0x1907,
    GL_RGB_INTEGER                : 0x8D98,
    GL_RGBA                       : 0x1908,
    GL_RGBA_INTEGER               : 0x8D99,
    GL_DEPTH_COMPONENT            : 0x1902,
    GL_DEPTH_STENCIL              : 0x84F9,
    GL_LUMINANCE_ALPHA            : 0x190A,
    GL_LUMINANCE                  : 0x1909,
    GL_ALPHA                      : 0x1906,
};

const bytesPerPixel_formats_GLES2: {[key:string]:number} = {
    GL_RED                        : 1,
    GL_RED_INTEGER                : 4,
    GL_RG                         : 2,
    GL_RG_INTEGER                 : 4,
    GL_RGB                        : 3,
    GL_RGB_INTEGER                : 4,
    GL_RGBA                       : 4,
    GL_RGBA_INTEGER               : 4,
    GL_DEPTH_COMPONENT            : 1,
    GL_DEPTH_STENCIL              : 2,
    GL_LUMINANCE_ALPHA            : 2,
    GL_LUMINANCE                  : 1,
    GL_ALPHA                      : 1,

};

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


const soname = 'libGLES_mali.so'

const patchGame = () => {
}

const hookGame = () => {
    const appInfo = getAndroidAppInfo()

    const dumpDir = `${appInfo.externalFilesDir}/dumps`;
    let fileNo = 0;

    console.log(`dump directory: ${dumpDir}`);

    // rmdir(dumpDir);
    const system = new NativeFunction(Module.getExportByName(null, 'system'),'int',['pointer']);
    system(Memory.allocUtf8String(`rm -fr ${dumpDir} && mkdir -p ${dumpDir}`));

    const hooksForTexture2D : {p:NativePointer, name?:string , opts:HookFunActionOptArgs} [] = [

{p:Module.getExportByName(soname,"glCompressedTexImage2D"     ) , name :"glCompressedTexImage2D"    , opts:{}, }, 
{p:Module.getExportByName(soname,"glCompressedTexImage3D"     ) , name :"glCompressedTexImage3D"    , opts:{}, }, 
{p:Module.getExportByName(soname,"glCompressedTexSubImage2D"  ) , name :"glCompressedTexSubImage2D" , opts:{}, }, 
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
{p:Module.getExportByName(soname,"glTexSubImage2D"  ) , name :"glTexSubImage2D" , opts:{}, }, 
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

const testGame = () => {
    
}

const handleSo=()=>{


    patchGame();
    hookGame();
    testGame();

}

const test = ()=>{

    const m = Process.findModuleByName(soname);
    if(m){
        handleSo()
    }
    else{
        hookDlopen(soname, handleSo)
    }

}

console.log('##################################################')
Java.perform(test)
