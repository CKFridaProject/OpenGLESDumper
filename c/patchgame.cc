

#include <stdio.h>
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#include <GLES3/gl32.h>
#include <ftw.h>
#include <sys/stat.h>
#include <unistd.h>
#include <curl/curl.h>

extern "C" void _frida_log(const char* message);
extern "C" void _frida_err(const char* message, bool exit=false);
extern "C" void _frida_hexdump(void* ptr, int len=0x20);

#define LOG_INFOS_WITH_N(N, fmt, args...)                         \
do{                                                               \
    char buff[N];                                                 \
    snprintf(buff, N,  fmt , ##args);                             \
    _frida_log(buff);                                    \
}while(0)

#define LOG_INFOS_WITH_N_FILE_LINE(N, fmt, args...)               \
LOG_INFOS_WITH_N(N, "[%s:%d] " fmt , __FILE__, __LINE__,  ##args);

#define LOG_INFOS(fmt, args...)  LOG_INFOS_WITH_N_FILE_LINE(0x800, fmt, ##args)


const char* getInternalFormatsGLES2( int internalFormat ) ;
// Write data callback function (called within the context of
// curl_easy_perform.

size_t write_data(void *ptr, size_t size, size_t nmemb, void *stream) {
    *(size_t*)stream += size * nmemb;
    return size * nmemb;
}

size_t get_body_size(const char *url) {
    CURL *curl;
    CURLcode res;
    size_t len = 0;

    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();

    if(curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_NOBODY, 0L); // get body
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_data);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &len);

        res = curl_easy_perform(curl);
        if(res != CURLE_OK) {
            fprintf(stderr, "curl_easy_perform() failed: %sn",
                    curl_easy_strerror(res));
        }

        curl_easy_cleanup(curl);
    }

    curl_global_cleanup();
    return len;
}


extern "C" int __attribute__((visibility("default"))) writeTextFile (const char* filename, char* context) {
    FILE* fp = fopen(filename, "w");
    if (fp == (void*)0) {
        return -1;
    }
    int ret = fprintf(fp, "%s", context);
    fclose(fp);
    return ret;
}

static const char base64_chars[] =
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789+/";

extern "C" int __attribute__((visibility("default"))) base64_encode(const unsigned char *in, int in_len, char *out, int out_len) {
    int i, j;
    int output_len = 4 * ((in_len + 2) / 3);

    if (out != NULL) {
        for (i = 0, j = 0; i < in_len; i += 3, j += 4) {
            int a = in[i];
            int b = (i + 1 < in_len) ? in[i + 1] : 0;
            int c = (i + 2 < in_len) ? in[i + 2] : 0;

            out[j] = base64_chars[a >> 2];
            out[j + 1] = base64_chars[((a & 0x03) << 4) | (b >> 4)];
            out[j + 2] = (i + 1 < in_len) ? base64_chars[((b & 0x0F) << 2) | (c >> 6)] : '=';
            out[j + 3] = (i + 2 < in_len) ? base64_chars[c & 0x3F] : '=';
        }

        if (j < out_len) {
            out[j] = '0';
        }
    }

    return output_len;
}


int delete_file(const char *path, const struct stat *s, int type, struct FTW *ftwb) {
    if(remove(path) < 0) {
        perror("remove");
        return -1;
    }
    return 0;
}

int delete_and_remake_folder(const char *folder_path) {
    if (nftw(folder_path, delete_file, 64, FTW_DEPTH | FTW_PHYS) < 0) {
        perror("nftw");
        return -1;
    }

    if (mkdir(folder_path, S_IRWXU | S_IRWXG | S_IROTH | S_IXOTH) < 0) {
        perror("mkdir");
        return -1;
    }

    return 0;
}


struct TextureInfo {
    int width;
    int height;
    int internalFormat;   
    int isCompressed;
};

extern "C" int __attribute__((visibility("default"))) getCurrentTexture2DInfo (TextureInfo* info, int level) {
    if(info == NULL) {
        return -1;
    }
    int width, height, internalFormat, isCompressed;

    // Get the width, height, and internal format of the currently bound texture
    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_WIDTH, &width);
    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_HEIGHT, &height);
    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_INTERNAL_FORMAT, &internalFormat);
    glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_COMPRESSED, &isCompressed);


    LOG_INFOS("width: %d, height: %d, internalFormat: %d, isCompressed: %d", width, height, internalFormat, isCompressed);

    info->width = width;
    info->height = height;
    info->internalFormat = internalFormat;
    info->isCompressed = isCompressed;
    return 0;
}

extern "C" int __attribute__((visibility("default"))) getCurrentTexture2DId () {
    int textureID=0;
    // Get the currently bound texture ID
    glGetIntegerv(GL_TEXTURE_BINDING_2D, &textureID);

    LOG_INFOS("textureID: %d", textureID);

    return textureID;
}

extern "C" int __attribute__((visibility("default"))) testOpenGL (unsigned char* base, const char* outputDir) {
    const GLubyte* versionGL = glGetString(GL_VERSION); 
    LOG_INFOS("versionGL: %s", versionGL);
    return 0;
}

extern "C" int __attribute__((visibility("default"))) init (unsigned char* base, const char* outputDir) {


    LOG_INFOS(" go here %p %s", base, outputDir);
    delete_and_remake_folder(outputDir);

    //const char* url = "http://192.168.2.196:3000/";
    //auto sz =  get_body_size(url);
    //LOG_INFOS("size: %d", sz);
    return 0;
}


void saveTextureToFile(GLuint textureId, int width, int height, const char* filename, int textureFormat) {

    glBindTexture(GL_TEXTURE_2D, textureId);
    if (glGetError() != GL_NO_ERROR) {
        LOG_INFOS( "Error occurred while binding the texture with %d format %x(%s)", textureId, textureFormat, getInternalFormatsGLES2(textureFormat));
        return;
    }

    // Set up framebuffer and renderbuffer
    GLuint framebuffer, renderbuffer;
    glGenFramebuffers(1, &framebuffer);
    if (glGetError() != GL_NO_ERROR) {
        LOG_INFOS("Error occurred while generating the framebuffern");
        return;
    }

    GLubyte* pixels = new GLubyte[width * height * 4];
    glGenRenderbuffers(1, &renderbuffer);

    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    glBindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
    glRenderbufferStorage(GL_RENDERBUFFER, GL_RGBA8, width, height);
    glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, renderbuffer);

    // Attach the texture to the FBO
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureId, 0);

    // Check FBO status
    GLenum status = glCheckFramebufferStatus(GL_FRAMEBUFFER);
    if (status != GL_FRAMEBUFFER_COMPLETE) {
        LOG_INFOS("Failed to setup Framebuffer status: %d with format: %x(%s)", status, textureFormat, getInternalFormatsGLES2(textureFormat));
        return;
    }

    // Read the pixel data
    glReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels);

    // Open a binary file in write mode
    FILE* outFile = fopen(filename, "wb");
    if(outFile == NULL) {
        LOG_INFOS("Failed to open file: %s", filename);
        delete [] pixels;
        return ;
    }

    // Write width, height, and format
    fwrite(&width, sizeof(width), 1, outFile);
    fwrite(&height, sizeof(height), 1, outFile);
    GLenum format = GL_RGBA;
    fwrite(&format, sizeof(format), 1, outFile);

    // Write the pixel data
    fwrite(pixels, 1, width * height * 4, outFile);

    // Clean up
    delete[] pixels;
    glDeleteFramebuffers(1, &framebuffer);
    glDeleteRenderbuffers(1, &renderbuffer);

    // Close the file
    fclose(outFile);

    // LOG_INFOS("write texture to file: %s", filename);
}

const char* getInternalFormatsGLES2( int internalFormat ) {
    switch (internalFormat)
    {
    
    case GL_RGB                                        : return "GL_RGB"                           ;
    case GL_RGBA                                       : return "GL_RGBA"                          ;
    case GL_LUMINANCE_ALPHA                            : return "GL_LUMINANCE_ALPHA"               ;
    case GL_LUMINANCE                                  : return "GL_LUMINANCE"                     ;
    case GL_ALPHA                                      : return "GL_ALPHA"                         ;
    case GL_R8                                         : return "GL_R8"                            ;
    case GL_R8_SNORM                                   : return "GL_R8_SNORM"                      ;
    case GL_R16F                                       : return "GL_R16F"                          ;
    case GL_R32F                                       : return "GL_R32F"                          ;
    case GL_R8UI                                       : return "GL_R8UI"                          ;
    case GL_R8I                                        : return "GL_R8I"                           ;
    case GL_R16UI                                      : return "GL_R16UI"                         ;
    case GL_R16I                                       : return "GL_R16I"                          ;
    case GL_R32UI                                      : return "GL_R32UI"                         ;
    case GL_R32I                                       : return "GL_R32I"                          ;
    case GL_RG8                                        : return "GL_RG8"                           ;
    case GL_RG8_SNORM                                  : return "GL_RG8_SNORM"                     ;
    case GL_RG16F                                      : return "GL_RG16F"                         ;
    case GL_RG32F                                      : return "GL_RG32F"                         ;
    case GL_RG8UI                                      : return "GL_RG8UI"                         ;
    case GL_RG8I                                       : return "GL_RG8I"                          ;
    case GL_RG16UI                                     : return "GL_RG16UI"                        ;
    case GL_RG16I                                      : return "GL_RG16I"                         ;
    case GL_RG32UI                                     : return "GL_RG32UI"                        ;
    case GL_RG32I                                      : return "GL_RG32I"                         ;
    case GL_RGB8                                       : return "GL_RGB8"                          ;
    case GL_SRGB8                                      : return "GL_SRGB8"                         ;
    case GL_RGB565                                     : return "GL_RGB565"                        ;
    case GL_RGB8_SNORM                                 : return "GL_RGB8_SNORM"                    ;
    case GL_R11F_G11F_B10F                             : return "GL_R11F_G11F_B10F"                ;
    case GL_RGB9_E5                                    : return "GL_RGB9_E5"                       ;
    case GL_RGB16F                                     : return "GL_RGB16F"                        ;
    case GL_RGB32F                                     : return "GL_RGB32F"                        ;
    case GL_RGB8UI                                     : return "GL_RGB8UI"                        ;
    case GL_RGB8I                                      : return "GL_RGB8I"                         ;
    case GL_RGB16UI                                    : return "GL_RGB16UI"                       ;
    case GL_RGB16I                                     : return "GL_RGB16I"                        ;
    case GL_RGB32UI                                    : return "GL_RGB32UI"                       ;
    case GL_RGB32I                                     : return "GL_RGB32I"                        ;
    case GL_RGBA8                                      : return "GL_RGBA8"                         ;
    case GL_SRGB8_ALPHA8                               : return "GL_SRGB8_ALPHA8"                  ;
    case GL_RGBA8_SNORM                                : return "GL_RGBA8_SNORM"                   ;
    case GL_RGB5_A1                                    : return "GL_RGB5_A1"                       ;
    case GL_RGBA4                                      : return "GL_RGBA4"                         ;
    case GL_RGB10_A2                                   : return "GL_RGB10_A2"                      ;
    case GL_RGBA16F                                    : return "GL_RGBA16F"                       ;
    case GL_RGBA32F                                    : return "GL_RGBA32F"                       ;
    case GL_RGBA8UI                                    : return "GL_RGBA8UI"                       ;
    case GL_RGBA8I                                     : return "GL_RGBA8I"                        ;
    case GL_RGB10_A2UI                                 : return "GL_RGB10_A2UI"                    ;
    case GL_RGBA16UI                                   : return "GL_RGBA16UI"                      ;
    case GL_RGBA16I                                    : return "GL_RGBA16I"                       ;
    case GL_RGBA32I                                    : return "GL_RGBA32I"                       ;
    case GL_RGBA32UI                                   : return "GL_RGBA32UI"                      ;
    case GL_DEPTH_COMPONENT16                          : return "GL_DEPTH_COMPONENT16"             ;
    case GL_DEPTH_COMPONENT24                          : return "GL_DEPTH_COMPONENT24"             ;
    case GL_DEPTH_COMPONENT32F                         : return "GL_DEPTH_COMPONENT32F"            ;
    case GL_DEPTH24_STENCIL8                           : return "GL_DEPTH24_STENCIL8"              ;
    case GL_DEPTH32F_STENCIL8                          : return "GL_DEPTH32F_STENCIL8"             ;
    case GL_COMPRESSED_RGBA8_ETC2_EAC                  : return "GL_COMPRESSED_RGBA8_ETC2_EAC"     ;
    case GL_ALPHA8_OES                                 : return "GL_ALPHA8_OES"                    ;
    case GL_COMPRESSED_RGBA_ASTC_4x4_KHR               : return "GL_COMPRESSED_RGBA_ASTC_4x4_KHR"  ;
    case GL_COMPRESSED_RGBA_ASTC_8x8_KHR               : return "GL_COMPRESSED_RGBA_ASTC_8x8_KHR"  ;
    case GL_COMPRESSED_RGB8_ETC2                       : return "GL_COMPRESSED_RGB8_ETC2"          ;
    case GL_ETC1_RGB8_OES                              : return "GL_ETC1_RGB8_OES"                 ;

    default:
        LOG_INFOS("Unknow: %d", internalFormat);
        return "Unknow internalFormat";
    }
};

const int MAX_TEXTURE_CNT=3000;
int listAllTexture2Ds(unsigned char* base, const char* outputDir) {
    int originalTextureID = 0;
    glGetIntegerv(GL_TEXTURE_BINDING_2D, &originalTextureID);
    // list all texture2d
    for (int t = 0; t < MAX_TEXTURE_CNT; t++)
    {
        if (glIsTexture(t)) {
            glBindTexture(GL_TEXTURE_2D, t);

            int level = 0;
            int width = 0, height = 0, internalFormat = 0, isCompressed = 0;

            // Get the width, height, and internal format of the currently bound texture
            glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_WIDTH, &width);
            glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_HEIGHT, &height);
            glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_INTERNAL_FORMAT, &internalFormat);
            glGetTexLevelParameteriv(GL_TEXTURE_2D, level, GL_TEXTURE_COMPRESSED, &isCompressed);

            // LOG_INFOS("TextureId: %d width: %d, height: %d, internalFormat: 0x%x(%s), isCompressed: %d",
            //           t, width, height, internalFormat, getInternalFormatsGLES2(internalFormat), isCompressed);

            if(    internalFormat == GL_RGB8
                || internalFormat == GL_RGBA4
                || internalFormat == GL_RGBA8
                || internalFormat == GL_R8
            )
            {

                static char filename[1024];
                sprintf(filename, "%s/%08d.bin", outputDir, t);
                saveTextureToFile(t, width, height, filename, internalFormat);
            }
        }
    }

    glBindTexture(GL_TEXTURE_2D, originalTextureID);

    return 0;
}

#include <GLES3/gl3.h>
#include <iostream>
#include <string>

// Function to compile a shader and check for errors
GLuint loadShader(GLenum type, const char* src)
{
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &src, NULL);
    glCompileShader(shader);
    return shader;
}

// Function to check for shader or program errors
void checkCompileErrors(GLuint shader, std::string type)
{
    GLint success;
    GLchar infoLog[1024];
    if(type != "PROGRAM")
    {
        glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
        if(!success)
        {
            glGetShaderInfoLog(shader, 1024, NULL, infoLog);
            LOG_INFOS ("Shader compilation error of type: %s ", type.c_str());
            LOG_INFOS ("%s", infoLog);
        }
    }
    else
    {
        glGetProgramiv(shader, GL_LINK_STATUS, &success);
        if(!success)
        {
            glGetProgramInfoLog(shader, 1024, NULL, infoLog);
            LOG_INFOS ("Program linking error of type: %s ", type.c_str());
            LOG_INFOS ("%s", infoLog);
        }
    }
}

// Function to create a shader program from vertex and fragment shader sources
GLuint createProgram(const char* vertexShaderSource, const char* fragmentShaderSource)
{
    GLuint vertexShader = loadShader(GL_VERTEX_SHADER, vertexShaderSource);
    checkCompileErrors(vertexShader, "vertex");
    GLuint fragmentShader = loadShader(GL_FRAGMENT_SHADER, fragmentShaderSource);
    checkCompileErrors(fragmentShader, "fragment");

    GLuint program = glCreateProgram();
    glAttachShader(program, vertexShader);
    glAttachShader(program, fragmentShader);
    glLinkProgram(program);
    checkCompileErrors(program, "PROGRAM");

    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);

    return program;
}

// int main()
// {
//     // Your OpenGL context initialization code here...
// 
//     const char *vertexShaderSource = "...";  // Your vertex shader source here
//     const char *fragmentShaderSource = "..."; // Your fragment shader source here
//     GLuint program = createProgram(vertexShaderSource, fragmentShaderSource);
//     
//     // Your OpenGL rendering code here...
//     
//     glDeleteProgram(program);
// 
//     // Your OpenGL context cleanup code here...
// 
//     return 0;
// }

// Shaders
GLchar* vertexShaderSource = 
    "#version 320 es                    \n"
    "in vec4 position;                  \n"
    "in vec2 texCoords;                 \n"
    "out vec2 TexCoords;                \n"
    "void main()                        \n"
    "{                                  \n"
    "    gl_Position = position;        \n"
    "    TexCoords = texCoords;         \n"
    "}                                  \n";

GLchar* fragmentShaderSource =
    "#version 320 es                            \n"
    "precision mediump float;                   \n"
    "in vec2 TexCoords;                         \n"
    "uniform sampler2D sampler;                 \n"
    "out vec4 color;                            \n"
    "void main()                                \n"
    "{                                          \n"
    "    color = texture(sampler, TexCoords);   \n"
    "}                                          \n";

// Full-screen quad
GLfloat quadVertices[] = {
    -1.0f,  1.0f,  0.0f,  0.0f, 1.0f,
    -1.0f, -1.0f,  0.0f,  0.0f, 0.0f,
     1.0f, -1.0f,  0.0f,  1.0f, 0.0f,

     1.0f, -1.0f,  0.0f,  1.0f, 0.0f,
     1.0f,  1.0f,  0.0f,  1.0f, 1.0f,
    -1.0f,  1.0f,  0.0f,  0.0f, 1.0f
};

class TextureDumper {


public:
    TextureDumper() {
    }

    ~TextureDumper() {
    }

    void start () {
        glRunCount = 0;
        glMaxCount = 100;
    }

    int tick () {


        {
            if(glRunCount==1)
        {
    // Application-specific setup code here...

    // 1. Create the uncompressed texture
    GLuint uncompressedTexture;
    glGenTextures(1, &uncompressedTexture);
    glBindTexture(GL_TEXTURE_2D, uncompressedTexture);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, NULL);

    // 2. Create and set up the framebuffer
    GLuint framebuffer;
    glGenFramebuffers(1, &framebuffer);
    glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, uncompressedTexture, 0);

    // 3. Render the compressed texture to the framebuffer using a shader
    GLuint compressedTexture = textureId; 

    //GLuint program = ...; // Implement shader compilation and program creation
    GLuint program = createProgram(vertexShaderSource, fragmentShaderSource);

    GLuint VAO, VBO;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);
    glBindVertexArray(VAO);
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(quadVertices), &quadVertices, GL_STATIC_DRAW);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 5 * sizeof(GLfloat), (GLvoid*)0);
    glEnableVertexAttribArray(1);
    glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 5 * sizeof(GLfloat), (GLvoid*)(3 * sizeof(GLfloat)));

    glUseProgram(program);
    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, compressedTexture);
    glUniform1i(glGetUniformLocation(program, "sampler"), 0);
    glDrawArrays(GL_TRIANGLES, 0, 6);

    // 4. Read pixel data
    GLubyte* pixels = new GLubyte[width * height * 4];
    glReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels);

    _frida_hexdump(pixels, 0x100);

    FILE *outFile = fopen("/data/data/com.Joymax.GreatMagician/files/tt.bin", "wb");
    if (outFile == NULL) {
        LOG_INFOS("Failed to open file: ");

    } else {
        // Write width, height, and format
        fwrite(&width, sizeof(width), 1, outFile);
        fwrite(&height, sizeof(height), 1, outFile);
        GLenum format = GL_RGBA;
        fwrite(&format, sizeof(format), 1, outFile);

        // Write the pixel data
        fwrite(pixels, 1, width * height * 4, outFile);
        fclose(outFile);
    }

    // 5. Clean up
    delete[] pixels;
    glDeleteFramebuffers(1, &framebuffer);
    glDeleteTextures(1, &uncompressedTexture);
    glDeleteBuffers(1, &VBO);
    glDeleteVertexArrays(1, &VAO);
    glDeleteProgram(program);

    // Application-specific shutdown code here...
}


        }

        if(glRunCount < glMaxCount) {
            glRunCount++;
        }
        return glRunCount;
    }

private:
    int glRunCount = -1;
    int glMaxCount = -1;
    int textureId = 189;
    int width = 512, height = 512, textureFormat = 0x9278, isCompressed = 1;
}; 

TextureDumper gTextureDumper;

extern "C" int __attribute__((visibility("default"))) startOpenGLCmd (unsigned char* base, const char* outputDir ) {
    gTextureDumper.start();
    return 0;
}
extern "C" int __attribute__((visibility("default"))) hookOpenGL (unsigned char* base, const char* outputDir) {
    if(0) {
        const GLubyte *versionGL = glGetString(GL_VERSION);
        LOG_INFOS("versionGL: %s", versionGL);
        GLint value = 0;
        glGetIntegerv(GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS, &value);
        LOG_INFOS("GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS: %d", value);

        glGetIntegerv(GL_MAX_TEXTURE_IMAGE_UNITS, &value);
        LOG_INFOS("GL_MAX_TEXTURE_IMAGE_UNITS: %d", value);

        glGetIntegerv(GL_MAX_COLOR_ATTACHMENTS, &value);
        LOG_INFOS("GL_MAX_COLOR_ATTACHMENTS: %d", value);
    }

    if(0){
        listAllTexture2Ds(base, outputDir);
    }

    gTextureDumper.tick();


    return 0;
}

