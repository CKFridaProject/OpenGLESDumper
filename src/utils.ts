

export interface  glTexImage2D_DATA {
    target         : number;
    level          : number;
    internalFormat : number;
    width          : number;
    height         : number;
    border         : number;
    format         : number;
    type           : number;
    data           : string;
};

export interface  glTexSubImage2D_DATA {
    target         : number;
    level          : number;
    xoffset        : number;
    yoffset        : number;
    width          : number;
    height         : number;
    format         : number;
    type           : number;
    data           : string;
};

export interface  glCompreesdTexImage2D_DATA {
    target         : number;
    level          : number;
    internalFormat : number;
    width          : number;
    height         : number;
    border         : number;
    format         : number;
    data           : string;
};

export interface  glCompreesdTexSubImage2D_DATA {
    target         : number;
    level          : number;
    xoffset        : number;
    yoffset        : number;
    width          : number;
    height         : number;
    format         : number;
    data           : string;
};


export interface DUMP_DATA {
    function    : 'glTexImage2D' 
                | 'glTexSubImage2D'
                | 'glCompressedTexImage2D'
                | 'glCompressedTexSubImage2D'
                ;

    data        : glTexImage2D_DATA
                | glTexSubImage2D_DATA
                | glCompreesdTexImage2D_DATA
                | glCompreesdTexSubImage2D_DATA
                ;
        
}

export const types_GLES2: {[key:string]:number} = {
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

export const bytesPerPixel_types_GLES2: {[key:string]:number} = {
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



export const internalFormats_GLES2: { [key: string]: number } = {
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


export const targets_GLES2: { [key: string]: number } = {
    GL_TEXTURE_2D                   : 0x0DE1,
    GL_TEXTURE_CUBE_MAP_POSITIVE_X  : 0x8515,
    GL_TEXTURE_CUBE_MAP_NEGATIVE_X  : 0x8516,
    GL_TEXTURE_CUBE_MAP_POSITIVE_Y  : 0x8517,
    GL_TEXTURE_CUBE_MAP_NEGATIVE_Y  : 0x8518,
    GL_TEXTURE_CUBE_MAP_POSITIVE_Z  : 0x8519,
    GL_TEXTURE_CUBE_MAP_NEGATIVE_Z  : 0x851A,
};

export const formats_GLES2: {[key:string]:number} = {
    GL_RED                                      : 0x1903,
    GL_RED_INTEGER                              : 0x8D94,
    GL_RG                                       : 0x8227,
    GL_RG_INTEGER                               : 0x8228,
    GL_RGB                                      : 0x1907,
    GL_RGB_INTEGER                              : 0x8D98,
    GL_RGBA                                     : 0x1908,
    GL_RGBA_INTEGER                             : 0x8D99,
    GL_DEPTH_COMPONENT                          : 0x1902,
    GL_DEPTH_STENCIL                            : 0x84F9,
    GL_LUMINANCE_ALPHA                          : 0x190A,
    GL_LUMINANCE                                : 0x1909,
    GL_ALPHA                                    : 0x1906,
    GL_ETC1_RGB8_OES                            : 0x8D64,
    GL_COMPRESSED_RGB_S3TC_DXT1_EXT             : 0x83F0,
    GL_COMPRESSED_RGBA_S3TC_DXT1_EXT            : 0x83F1,
    GL_COMPRESSED_RGBA_S3TC_DXT3_EXT            : 0x83F2,
    GL_COMPRESSED_RGBA_S3TC_DXT5_EXT            : 0x83F3,
    GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG          : 0x8C00,
    GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG          : 0x8C01,
    GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG         : 0x8C02,
    GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG         : 0x8C03,
    GL_ATC_RGB_AMD                              : 0x8C92,
    GL_ATC_RGBA_EXPLICIT_ALPHA_AMD              : 0x8C93,
    GL_ATC_RGBA_INTERPOLATED_ALPHA_AMD          : 0x87EE,

    GL_COMPRESSED_R11_EAC                             : 0x9270,
    GL_COMPRESSED_SIGNED_R11_EAC                      : 0x9271,
    GL_COMPRESSED_RG11_EAC                            : 0x9272,
    GL_COMPRESSED_SIGNED_RG11_EAC                     : 0x9273,
    GL_COMPRESSED_RGB8_ETC2                           : 0x9274,
    GL_COMPRESSED_SRGB8_ETC2                          : 0x9275,
    GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2       : 0x9276,
    GL_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2      : 0x9277,
    GL_COMPRESSED_RGBA8_ETC2_EAC                      : 0x9278,
    GL_COMPRESSED_SRGB8_ALPHA8_ETC2_EAC               : 0x9279,
    GL_COMPRESSED_RGBA_ASTC_4x4_KHR                   : 0x93B0,
    GL_COMPRESSED_RGBA_ASTC_5x4_KHR                   : 0x93B1,
    GL_COMPRESSED_RGBA_ASTC_5x5_KHR                   : 0x93B2,
    GL_COMPRESSED_RGBA_ASTC_6x5_KHR                   : 0x93B3,
    GL_COMPRESSED_RGBA_ASTC_6x6_KHR                   : 0x93B4,
    GL_COMPRESSED_RGBA_ASTC_8x5_KHR                   : 0x93B5,
    GL_COMPRESSED_RGBA_ASTC_8x6_KHR                   : 0x93B6,
    GL_COMPRESSED_RGBA_ASTC_8x8_KHR                   : 0x93B7,
    GL_COMPRESSED_RGBA_ASTC_10x5_KHR                  : 0x93B8,
    GL_COMPRESSED_RGBA_ASTC_10x6_KHR                  : 0x93B9,
    GL_COMPRESSED_RGBA_ASTC_10x8_KHR                  : 0x93BA,
    GL_COMPRESSED_RGBA_ASTC_10x10_KHR                 : 0x93BB,
    GL_COMPRESSED_RGBA_ASTC_12x10_KHR                 : 0x93BC,
    GL_COMPRESSED_RGBA_ASTC_12x12_KHR                 : 0x93BD,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR           : 0x93D0,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR           : 0x93D1,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR           : 0x93D2,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR           : 0x93D3,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR           : 0x93D4,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR           : 0x93D5,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR           : 0x93D6,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR           : 0x93D7,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR          : 0x93D8,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR          : 0x93D9,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR          : 0x93DA,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR         : 0x93DB,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR         : 0x93DC,
    GL_COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR         : 0x93DD,
};

export const bytesPerPixel_formats_GLES2: {[key:string]:number} = {
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

export const findName = (n:number, names: {[key:string]:number}):string => {
    return Object.keys(names).find(k => names[k] == n) || `unknow 0x${n.toString(16).toUpperCase()}`;
}
