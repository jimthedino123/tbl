/*!
 * TBL.js
 * Binary JSON Table File Library
 * https://tbljs.netlify.app/tbl.js
 */

(function(global){

"use strict";

class TBLTable {

    constructor(data = {}){

        this.columns = Array.isArray(data.columns)
            ? data.columns
            : [];

        this.rows = Array.isArray(data.rows)
            ? data.rows
            : [];

        this.meta = data.meta || {
            created: new Date().toISOString(),
            version: "1.0"
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

        for(let i = 0; i < this.columns.length; i++){

            row.push(data[i] ?? "");

        }

        this.rows.push(row);

        return this;

    }

    removeRow(index){

        this.rows.splice(index,1);

        return this;

    }

    removeColumn(index){

        this.columns.splice(index,1);

        this.rows.forEach(row=>{
            row.splice(index,1);
        });

        return this;

    }

    setCell(row,col,value){

        if(!this.rows[row]){
            throw new Error("Row does not exist");
        }

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

        return JSON.stringify(this.toObject());

    }

    toBinary(){

        const encoder = new TextEncoder();

        return encoder.encode(this.toJSON());

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

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");

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
            throw new Error("Container not found");
        }

        container.innerHTML = "";

        const wrapper = document.createElement("div");
        wrapper.className = "tbl-wrapper";

        this.rows.forEach((row,rowIndex)=>{

            const card = document.createElement("div");
            card.className = options.rowClass || "tbl-row";

            row.forEach((cell,colIndex)=>{

                const div = document.createElement("div");

                div.className =
                    options.cellClass || "tbl-cell";

                const label = document.createElement("strong");

                label.textContent =
                    this.columns[colIndex] + ": ";

                const value = document.createElement("span");

                value.textContent = cell;

                div.appendChild(label);
                div.appendChild(value);

                card.appendChild(div);

            });

            wrapper.appendChild(card);

        });

        container.appendChild(wrapper);

        return wrapper;

    }

}

const TBL = {

    version:"1.0.0",

    Table:TBLTable,

    create(data){

        return new TBLTable(data);

    },

    encode(data){

        const json =
            typeof data === "string"
            ? data
            : JSON.stringify(data);

        return new TextEncoder().encode(json);

    },

    decode(buffer){

        return new TextDecoder().decode(buffer);

    },

    parse(buffer){

        try{

            const json = this.decode(buffer);

            return JSON.parse(json);

        }catch(err){

            throw new Error(
                "Invalid TBL file"
            );

        }

    },

    async open(file){

        if(!(file instanceof File)){
            throw new Error("Expected File object");
        }

        const buffer = await file.arrayBuffer();

        const data = this.parse(buffer);

        return new TBLTable(data);

    },

    async fetch(url){

        const res = await fetch(url);

        if(!res.ok){

            throw new Error(
                "Failed to fetch TBL file"
            );

        }

        const buffer = await res.arrayBuffer();

        const data = this.parse(buffer);

        return new TBLTable(data);

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