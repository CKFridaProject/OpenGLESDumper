
import { DUMP_DATA, glTexImage2D_DATA } from "./utils"

// client.ts


const init = async (appDiv : HTMLDivElement) => {

    const list = document.createElement('ul');

    const detailDiv = document.createElement('div');
    appDiv.appendChild(detailDiv);

    const dumpListUrl='/dumps.json'

    const dumplist = await fetch(dumpListUrl).then(res => res.json());

    console.log('dumplist', dumplist.length)

    let dumpsObj: { [key: string]: any } = {};

    const allItems = dumplist.map(async (item: string) => {
        const dumpUrl = `dumps/${item}`;
        const response = await fetch(dumpUrl);
        const data = await response.json();

        dumpsObj[item] = data;
    });

    await Promise.all(allItems)

    Object.keys(dumpsObj).forEach(key => {
        const dumpData = dumpsObj[key]  as DUMP_DATA;

        const listItem = document.createElement('li');

        {
            const  fun  = dumpData.function;
            if(fun == 'glTexImage2D'){
                const data = dumpData.data as glTexImage2D_DATA;
                const text = `${key} ${fun} ${data.level} ${data.internalFormat} ${data.width} ${data.height} ${data.format} ${data.type} `
                listItem.textContent = text
            }
        }
        listItem.addEventListener('click', () => {
            updateDetail(key,dumpData);
        });


        list.appendChild(listItem);
    });
    
    appDiv.appendChild(list);



    function updateDetail(name:string,item: DUMP_DATA) {
        detailDiv.textContent = name;
    }



    const firstChild = list.firstChild;

    if (firstChild && firstChild instanceof HTMLElement) {
        firstChild.click();
    }

}

const appDiv = document.getElementById('app') as HTMLDivElement;
if(appDiv){

    init(appDiv)

}

