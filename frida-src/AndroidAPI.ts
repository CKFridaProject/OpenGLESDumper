
export const getAndroidAppInfo = ()=>{
    const ActivityThread = Java.use('android.app.ActivityThread');
    var currentApplication = ActivityThread.currentApplication();
    var context = currentApplication.getApplicationContext();

    return {
        applicationName                      : context.getPackageName().toString(),
        packageCodePath                      : context.getPackageCodePath                 (),
        packageResourcePath                  : context.getPackageResourcePath             (),
        cacheDir                             : context.getCacheDir                        ()?.getAbsolutePath().toString(),
        codeCacheDir                         : context.getCodeCacheDir                    ()?.getAbsolutePath().toString(),
        dataDir                              : context.getDataDir                         ()?.getAbsolutePath().toString(),
        externalCacheDir                     : context.getExternalCacheDir                ()?.getAbsolutePath().toString(),
        externalFilesDir                     : context.getExternalFilesDir            (null)?.getAbsolutePath().toString(),
        filesDir                             : context.getFilesDir                        ()?.getAbsolutePath().toString(),
        noBackupFilesDir                     : context.getNoBackupFilesDir                ()?.getAbsolutePath().toString(),
        obbDir                               : context.getObbDir                          ()?.getAbsolutePath().toString(),
    };
}

export const printJavaTraceStack = ()=>{
    console.log(Java.use("android.util.Log").getStackTraceString(Java.use("java.lang.Exception").$new()))
}

export const findJavaClasses = (clzname:string, show?:boolean):string[] =>{ 
    let clzs : string [] = []
    show = show??true;
    if(show) console.log('begin find class with ', clzname);                                                                                 
    Java.enumerateLoadedClasses({                                                                                                       
        onMatch(name, handle) {                                                                                                         
            if (name.includes(clzname)){                                                                                                
                if(show)  console.log(name, handle)                                                                                               
                clzs.push(name)
            }                                                                                                                           
        },                                                                                                                              
        onComplete() {                                                                                                                  
            if(show)console.log('find classes finished ')                                                                                       
        },                                                                                                                              
    });                                                                                                                                 
    return clzs;
}   


type InfoType = {
    level:number,
}
const ginfo : InfoType= {
    level : 0,
};

const getLevelString = ()=>{
    return '  '.repeat(ginfo.level);
}

export type HookJavaEnterFunType=   (tstr:string, thiz:any, argsList:string[]|undefined, ...args:any)=>IArguments|void;
export type HookJavaLeaveFunType=   (tstr:string, thiz:any, argsList:string[]|undefined, ret:any,...args:any)=>any|void;

export type HookJavaFuncType = BaseHookJavaFuncType & {
    clzname:string,
};

export type HookJavaFuncOpts =  {
    
    enterFun    ?: HookJavaEnterFunType,
    leaveFun    ?: HookJavaLeaveFunType,
    hide        ?: boolean,
    dumpStack   ?: boolean,
    skip        ?: boolean | ((tstr:string, thiz:any, argsList:string[]|undefined, ...args:any)=>boolean),
    maxhit      ?: number,
};

export type BaseHookJavaFuncType = {
    methodName   : string,
    argsList    ?: string[],
    
} & HookJavaFuncOpts;

export const hookJavaFunctions = (infos:HookJavaFuncType[]) => {
    infos.forEach(t=>{
        console.log('hook', JSON.stringify(t))
        hookJavaFunction(t);
    })
}

export const hookJavaFunction = (t:HookJavaFuncType) => {
    let method = t.argsList==undefined 
        ?  Java.use(t.clzname)[t.methodName]
        :  Java.use(t.clzname)[t.methodName].overload(...t.argsList)
    const hide      = t.hide?? false;
    const dumpStack = t.dumpStack?? false;
    const argsList  = t.argsList;
    const maxhit    = t.maxhit??-1;
    let hit = 0;
    method.implementation = function(){
        hit ++;
        let args = arguments; // can tramper arguments
        if(maxhit<0 || maxhit>=hit){
            if(!hide){ console.log(getLevelString(),'>',t.clzname, t.methodName, t.argsList, JSON.stringify(arguments)); }
            ginfo.level++;
            let tstr = getLevelString();
            if(t.enterFun!=undefined){ 
                let targs = t.enterFun(tstr,this, argsList, ...args);
                if(targs!=undefined){
                    args=targs;
                    if(!hide){ console.log(tstr, '>',t.clzname, t.methodName, t.argsList, JSON.stringify(args)); }
                }
            }
            if(dumpStack){ 
                console.log(tstr, 'Java call stack')
                getJavaCallStack().slice(3).forEach(t=>{
                    console.log(tstr, `  ${t.clzName}.${t.methodName}(${t.fileName}:${t.lineNumber})`);
                })
            }
        }
        let ret:any;
        let skip        = false;
        if(t.skip!=undefined){
            let tstr = getLevelString();
            if(typeof t.skip == 'boolean'){ skip = t.skip; }
            else{ skip = t.skip(tstr, this, argsList, ...args); }
        }
        if(!skip) ret = method.call(this, ...args);
        else ret=null;
        if(maxhit<0 || maxhit>=hit){
            let tstr = getLevelString();
            ginfo.level--;
            if(!hide){ console.log( '  '.repeat(ginfo.level), '<',t.clzname, t.methodName, ret); }
            if(t.leaveFun!=undefined){
                let tret = t.leaveFun(tstr, this, argsList, ret, ...args, argsList) 
                if(tret!=undefined){
                    { console.log(getLevelString(), 'mod return vaule =>',tret); }
                    return tret;
                } 
            }
        }
        return ret;
    }
}

interface Overload {
    argTypes : string[];
    modifiers?: any;
    retType  : string;
  }
  
const listMethodOverloads = (className: string, methodName: string): Overload[] => {
    const clazz = Java.use(className);
    const method = clazz[methodName].overloads;
  
    const overloads: Overload[] = [];
    for (let i = 0; i < method.length; i++) {
      const overload = method[i];
      let argumentTypes:{className:string}[] = overload.argumentTypes;
      const argTypes = argumentTypes.map(argType => argType.className);
      const retType = overload.returnType.className;
      overloads.push({ argTypes, retType });
    }
  
    return overloads;
}
 
interface Method {
    name: string;
    returnType: string;
    argTypes: string[];
    modifiers: string[];
}


interface JavaCallStackFrame {
    clzName?: string,
    methodName?: string,
    fileName?: string,
    lineNumber?: string,
};

const getJavaCallStack = (): JavaCallStackFrame[] => {
    const Thread = Java.use('java.lang.Thread');
    const Thread_currentThread = Thread.currentThread;
    const stackTrace = Thread.currentThread().getStackTrace();

    const infos :JavaCallStackFrame[] = [];

    stackTrace.forEach((stackElement: any) => {
        infos.push({
            clzName     : stackElement.getClassName(),
            methodName  : stackElement.getMethodName(),
            fileName    : stackElement.getFileName(), 
            lineNumber  : stackElement.getLineNumber(),
        })
    });
    return infos;
}

const getClassName = (obj: any): string => {
    return Java.use("java.lang.Object").getClass.call(obj).getName();
}

const MOD_PUBLIC = 0x0001;
const MOD_PRIVATE = 0x0002;
const MOD_PROTECTED = 0x0004;
const MOD_STATIC = 0x0008;
const MOD_FINAL = 0x0010;
const MOD_SYNCHRONIZED = 0x0020;
const MOD_BRIDGE = 0x0040;
const MOD_VARARGS = 0x0080;
const MOD_NATIVE = 0x0100;
const MOD_ABSTRACT = 0x0400;
const MOD_STRICT = 0x0800;
const MOD_SYNTHETIC = 0x1000;

const getMethodModifiers = (modifiersInt: number): string[] => {
    const modifiers: string[] = [];

    if (modifiersInt & MOD_PUBLIC) {
        modifiers.push('public');
    }
    if (modifiersInt & MOD_PRIVATE) {
        modifiers.push('private');
    }
    if (modifiersInt & MOD_PROTECTED) {
        modifiers.push('protected');
    }
    if (modifiersInt & MOD_STATIC) {
        modifiers.push('static');
    }
    if (modifiersInt & MOD_FINAL) {
        modifiers.push('final');
    }
    if (modifiersInt & MOD_SYNCHRONIZED) {
        modifiers.push('synchronized');
    }
    if (modifiersInt & MOD_BRIDGE) {
        modifiers.push('bridge');
    }
    if (modifiersInt & MOD_VARARGS) {
        modifiers.push('varargs');
    }
    if (modifiersInt & MOD_NATIVE) {
        modifiers.push('native');
    }
    if (modifiersInt & MOD_ABSTRACT) {
        modifiers.push('abstract');
    }
    if (modifiersInt & MOD_STRICT) {
        modifiers.push('strict');
    }
    if (modifiersInt & MOD_SYNTHETIC) {
        modifiers.push('synthetic');
    }

    return modifiers;
}

const listJavaClassMethods = (className: string, show?:boolean): Method[] => {
    show = show?? true;
    const clazz = Java.use(className);
    const methods:any[] = clazz.class.getDeclaredMethods();

    const classMethods: Method[] = [];
    methods.forEach(method => {
        const modifiers = getMethodModifiers(method.getModifiers());
        const name = method.getName();
        const returnType = method.getReturnType().getName();
        const argTypes:any = [];
        const params = method.getParameterTypes();
        for (let i = 0; i < params.length; i++) {
            argTypes.push(params[i].getName());
        }
        const info = { name, returnType, argTypes, modifiers };
        if(show) console.log(className, 'method', JSON.stringify(info))
        classMethods.push(info);
    });

    return classMethods;
}

export const hookMethodsInClass = (clzname:string, opts?:any)=>{
    listJavaClassMethods(clzname)
        .forEach(m=>{
            let info : HookJavaFuncType  = {
                clzname, methodName:m.name, argsList:m.argTypes,
            };

            if(opts) { info = {... info, ... opts}; }

            console.log('hooking', clzname, 'method', m, JSON.stringify(m), JSON.stringify(info))
            hookJavaFunction(info)
        })
}
