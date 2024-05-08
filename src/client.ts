
import { DUMP_DATA, glTexImage2D_DATA } from "./utils"

function sayHello() {
    const appDiv = document.getElementById('app');
    if (appDiv) {
        appDiv.innerHTML = '<h2>Hello World</h2>';
    }
}

// Call this function to modify the DOM
// sayHello();

{
    const appDiv = document.getElementById('app');
    if (appDiv) {
        const dumplistUrl = '/dumps.json';
        fetch(dumplistUrl)
            .then(res => res.json())
            .then((data) => {
                const ul = document.createElement('ul');
                data.forEach(function (dump: string) {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    const dumpUrl = '/dumps/' + dump;
                    a.href = `/showDump.html?u=${dumpUrl}`;
                    a.textContent = dump;
                    fetch(dumpUrl)
                        .then(res => res.json())
                        .then((data:DUMP_DATA) => {
                            const fun = data.function
                            if(fun == 'glTexImage2D'){
                                const info = data.data as glTexImage2D_DATA;
                                a.textContent += ` ${info.level} ${info.internalFormat} ${info.width}x${info.height} ${info.format} ${info.type}`
                            }
                            //const pre = document.createElement('pre');
                            //pre.textContent = JSON.stringify(data, null, 2);
                            //li.appendChild(pre);
                        });
                    li.appendChild(a);
                    ul.appendChild(li);
                });
                appDiv.appendChild(ul);
            });
    }
}



