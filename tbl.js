/*!
 * TBL.js
 * REAL BINARY .tbl TABLE FILES
 * https://tbljs.netlify.app/tbl.js
 */

(function(global){

"use strict";

function stringToBinary(str){

    return str
        .split("")
        .map(char =>
            char.charCodeAt(0)
                .toString(2)
                .padStart(8,"0")
        )
        .join("");

}

function binaryToString(binary){

    let result = "";

    for(let i = 0; i < binary.length; i += 8){

        const byte = binary.slice(i,i+8);

        if(byte.length < 8) continue;

        result += String.fromCharCode(
            parseInt(byte,2)
        );

    }

    return result;

}

class TBLTable{

    constructor(data = {}){

        this.columns = data.columns || [];
        this.rows = data.rows || [];

        this.meta = data.meta || {
            version:"2.0",
            created:new Date().toISOString()
        };

    }

    addColumn(name){

        this.columns.push(name);

        this.rows.forEach(row=>{
            row.push("");
        });

        return this;

    }

    addRow(data = []){

        const row = [];

        for(let i=0;i<this.columns.length;i++){

            row.push(data[i] ?? "");

        }

        this.rows.push(row);

        return this;

    }

    setCell(row,col,value){

        if(!this.rows[row]) return;

        this.rows[row][col] = value;

        return this;

    }

    getCell(row,col){

        return this.rows[row]?.[col];

    }

    toObject(){

        return {
            columns:this.columns,
            rows:this.rows,
            meta:this.meta
        };

    }

    toJSON(){

        return JSON.stringify(
            this.toObject()
        );

    }

    toBinary(){

        return stringToBinary(
            this.toJSON()
        );

    }

    toBlob(){

        return new Blob(
            [this.toBinary()],
            {
                type:"application/octet-stream"
            }
        );

    }

    download(filename = "table.tbl"){

        const blob = this.toBlob();

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;
        a.download = filename;

        document.body.appendChild(a);

        a.click();

        a.remove();

        setTimeout(()=>{
            URL.revokeObjectURL(url);
        },1000);

    }

    render(target, options = {}){

        const container =
            typeof target === "string"
            ? document.querySelector(target)
            : target;

        if(!container){

            throw new Error(
                "Container not found"
            );

        }

        container.innerHTML = "";

        this.rows.forEach(row=>{

            const card =
                document.createElement("div");

            card.className =
                options.rowClass || "tbl-row";

            row.forEach((cell,index)=>{

                const div =
                    document.createElement("div");

                div.className =
                    options.cellClass || "tbl-cell";

                div.innerHTML = `
                    <strong>
                        ${this.columns[index]}:
                    </strong>
                    <span>${cell}</span>
                `;

                card.appendChild(div);

            });

            container.appendChild(card);

        });

    }

}

const TBL = {

    version:"2.0",

    Table:TBLTable,

    stringToBinary,
    binaryToString,

    encode(data){

        const json =
            typeof data === "string"
            ? data
            : JSON.stringify(data);

        return stringToBinary(json);

    },

    decode(binary){

        return binaryToString(binary);

    },

    parse(binary){

        try{

            const json =
                binaryToString(binary);

            const data =
                JSON.parse(json);

            return new TBLTable(data);

        }catch(err){

            throw new Error(
                "Invalid TBL binary file"
            );

        }

    },

    async open(file){

        const binary =
            await file.text();

        return this.parse(binary);

    },

    async fetch(url){

        const res = await fetch(url);

        const binary =
            await res.text();

        return this.parse(binary);

    },

    save(data, filename = "table.tbl"){

        const table =
            data instanceof TBLTable
            ? data
            : new TBLTable(data);

        table.download(filename);

    }

};

global.TBL = TBL;

})(window);