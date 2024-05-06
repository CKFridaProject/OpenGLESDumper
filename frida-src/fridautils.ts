
'use strict';

import { 
    HookAction,
} from './HookAction'

import { 
    HookFunAction,
    HookFunActionOptArgs,
} from './HookFunAction'


const _frida_dummy_callback = new NativeCallback(function(){

},'void',[]);

const _frida_log_callback =  new NativeCallback(function(sp:NativePointer){
    console.log(sp.readUtf8String());
}, 'void', ['pointer']);

const _frida_err_callback =  new NativeCallback(function(sp:NativePointer, exitApp:number){
    console.error(sp.readUtf8String());
    if(exitApp){
        throw 'err occured and exit';
        new NativeFunction(Module.getExportByName(null,'exit'),'int',['int'])(-9);
    }
    else{
        throw 'err occured';
    }
}, 'void', ['pointer','int']);

const _frida_hexdump_callback =  new NativeCallback(function(sp:NativePointer, sz:number){
    console.log(
        hexdump(sp, {
            offset: 0,
            length: sz,
            header: true,
            ansi: false,
        })
    );
}, 'void', ['pointer','uint']);


//
// int _frida_inspect_ptr(const void* p, char* module_name, size_t module_name_len, void*& offset, void*& ghidra_offset);
const _frida_inspect_ptr_callback = new NativeCallback(function(p, module_name, module_name_len, offset, ghidra_offset){
    const getDefaultGhighOffset = ():NativePointer =>{
        if(Process.arch=='arm'  ){ return ptr(0x10000);     }
        if(Process.arch=='arm64'){ return ptr(0x100000);    }
        if(Process.arch=='ia32' ){ return ptr(0x400000);    }
        throw new Error(`unsupported arch ${Process.arch}`);
    }

    let ghidraOffset = getDefaultGhighOffset();

    let m = Process.findModuleByAddress(p);
    if(m==null) return -1;
    const mname = m.name;
    if(mname.length>=module_name_len) return -1;
    module_name.writeUtf8String(mname);
    const moffset = p.sub(m.base);
    offset.writePointer(moffset)

    const goffset = moffset.add(ghidraOffset);
    ghidra_offset.writePointer(goffset);
    
    return 0;
}, 'int',['pointer','pointer', 'uint','pointer', 'pointer']);


export const frida_symtab = {
    _frida_dummy       :  _frida_dummy_callback         ,
    _frida_log         :  _frida_log_callback           ,
    _frida_err         :  _frida_err_callback           ,
    _frida_hexdump     :  _frida_hexdump_callback       ,
    _frida_inspect_ptr :  _frida_inspect_ptr_callback   ,
};

export const frida_dummy_symtab =(funs:string[]): {[key:string]:NativeCallback<'void',[]>} =>{
    const _frida_callback = (fn:string): NativeCallback<'void',[]> =>{
        return new NativeCallback(function(){
            console.log('call dummy function', fn);
        },'void',[]);
    }

    let ret :{[key:string]:NativeCallback<'void',[]>} ={};
    funs.forEach(t=>{ ret[t] = _frida_callback(t); })
    return ret;
};

// extern "C" void _frida_hook_fun(void* func, char* fun_name, int args) ; 
const _hook_fun =  function (func: NativePointer, fun_name: NativePointer, argsCount: number, enterFunc:NativePointer, leaveFunc:NativePointer, show: number ): void {
    const _MAX_ARGS=15;
    const opt:HookFunActionOptArgs = {
        nparas:argsCount,
        hide:show==0,
        name:fun_name.readUtf8String()??"unknown",
        // showCallStack:true,
        enterFun:function(args, tstr, thiz){
            if(!enterFunc.isNull()){
if(argsCount==0) { new NativeFunction(enterFunc,'void',[])(); }
if(argsCount==1) { new NativeFunction(enterFunc,'void',['pointer'])(thiz.args0); }
if(argsCount==2) { new NativeFunction(enterFunc,'void',['pointer','pointer'])(thiz.args0, thiz.args1, ); }
if(argsCount==3) { new NativeFunction(enterFunc,'void',['pointer','pointer','pointer'])(thiz.args0, thiz.args1, thiz.args2, ); }
if(argsCount==4) { new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer'])(thiz.args0, thiz.args1, thiz.args2, thiz.args3, ); }
if(argsCount==5) { new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer'])(thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4,); }
if(argsCount==6) { new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer'])(thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, ); }
if(argsCount==7) { new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer'])(thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6,); }
if(argsCount==8) { new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'])(thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7,); }
if(argsCount==9) { new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'])(thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, ); }
if(argsCount==10){ new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'])( thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, ); } 
if(argsCount==11){ new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'                                               ])( thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, ); } 
if(argsCount==12){ new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer', 'pointer',                                   ])( thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, thiz.args11,  ); } 
if(argsCount==13){ new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer', 'pointer', 'pointer'                         ])( thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, thiz.args11, thiz.args12,  ); } 
if(argsCount==14){ new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer', 'pointer', 'pointer', 'pointer'              ])( thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, thiz.args11, thiz.args12, thiz.args13,  ); } 
if(argsCount==15){ new NativeFunction(enterFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer', 'pointer', 'pointer', 'pointer', 'pointer'   ])( thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, thiz.args11, thiz.args12, thiz.args13, thiz.args14 ); } 
            }
        },
        leaveFun:function(retval, tstr, thiz){
            if(!leaveFunc.isNull()){
if(argsCount==0) { new NativeFunction(leaveFunc,'void',['pointer',])(retval,); }
if(argsCount==1) { new NativeFunction(leaveFunc,'void',['pointer','pointer'])(retval, thiz.args0,); }
if(argsCount==2) { new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer'])(retval,thiz.args0, thiz.args1,); }
if(argsCount==3) { new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer','pointer'])(retval, thiz.args0, thiz.args1, thiz.args2,); }
if(argsCount==4) { new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer','pointer','pointer'])(retval, thiz.args0, thiz.args1, thiz.args2, thiz.args3,); }
if(argsCount==5) { new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer'])(retval,thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4,); }
if(argsCount==6) { new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer'])(retval, thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5,); }
if(argsCount==7) { new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'])(retval,thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6,); }
if(argsCount==8) { new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'])(retval,thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7,); }
if(argsCount==9) { new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'])(retval,thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8,); }
if(argsCount==10){ new NativeFunction(leaveFunc,'void',['pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'])( retval, thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9,); } 
if(argsCount==11){ new NativeFunction(enterFunc,'void',['pointer', 'pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer'                                               ])( retval, thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, ); } 
if(argsCount==12){ new NativeFunction(enterFunc,'void',['pointer', 'pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer', 'pointer',                                   ])( retval, thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, thiz.args11,  ); } 
if(argsCount==13){ new NativeFunction(enterFunc,'void',['pointer', 'pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer', 'pointer', 'pointer'                         ])( retval, thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, thiz.args11, thiz.args12,  ); } 
if(argsCount==14){ new NativeFunction(enterFunc,'void',['pointer', 'pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer', 'pointer', 'pointer', 'pointer'              ])( retval, thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, thiz.args11, thiz.args12, thiz.args13,  ); } 
if(argsCount==15){ new NativeFunction(enterFunc,'void',['pointer', 'pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer','pointer', 'pointer', 'pointer', 'pointer', 'pointer'   ])( retval, thiz.args0, thiz.args1, thiz.args2, thiz.args3, thiz.args4, thiz.args5, thiz.args6, thiz.args7, thiz.args8, thiz.args9, thiz.args10, thiz.args11, thiz.args12, thiz.args13, thiz.args14 ); } 
            }
        },
    };

    HookAction.addInstance(func, new HookFunAction(opt))

};
export const _frida_hook_fun = new NativeCallback( _hook_fun , 'void', ['pointer','pointer','int','pointer','pointer','int']);



