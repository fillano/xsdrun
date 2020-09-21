const args = require('minimist')(process.argv.slice(2));
const DOMParser = require('xmldom').DOMParser;
const fs = require('fs');

Array.prototype.asyncReduce = async function(cb, init) {
    let pre = init;
    for(let i=0; i<this.length; i++) {
        pre = await cb(pre, this[i], i, this);
    }
    return pre;
};

main(args)
.catch(reason=>console.log(reason));

async function main(args) {
    if(args._.length < 1) return help();
    let result = await args._[0].split(',').asyncReduce(async (pre, cur) => {
        let data = await readFile(cur);
        return deepMerge(pre, xsd_parser(new DOMParser().parseFromString(data)));
    }, {});
    console.log(JSON.stringify(result, null, 2));
}

function deepMerge(target, source) {
    Object.keys(source).forEach(k => {
        if(source.hasOwnProperty(k)) {
            if(!!target[k] && typeof target[k] === 'object' && typeof source[k] === 'object') {
                target[k] = deepMerge(target[k], source[k]);
            } else {
                if(!!target[k] && typeof target[k] !== typeof source[k]) throw new Error(`object merge error: ${k}, ${typeof source[k]}`);
                target[k] = source[k];
            }
        }
    });
    return target;
}

function xsd_parser(doc) {
    let ctypes = doc.getElementsByTagName('complexType');
    let complexTypes = Array.prototype.reduce.call(ctypes, (pre, cur) => {
        let name = cur.getAttribute('name');
        if(!!name) {
            let o = {};
            Array.prototype.forEach.call(cur.childNodes, (elm => {
                if(!!elm.tagName)
                    o.contentType = elm.tagName;
            }));
            pre[name] = o;
        }
        return pre;
    }, {});
    let elems = doc.getElementsByTagName('element');
    let elements = Array.prototype.reduce.call(elems, (pre, cur) => {
        let name = cur.getAttribute('name');
        if(!!name) {
            let o = {};
            o.type = cur.getAttribute('type');
            o.minOccurs = cur.getAttribute('minOccurs');
            o.maxOccurs = cur.getAttribute('maxOccurs');
            if(!pre[name]) pre[name] = [];
            if(pre[name].every(e => e.type !== o.type))
                pre[name].push(o);
        }
        return pre;
    }, {});
    return {elements, complexTypes};
}

async function readFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (err, data) => {
            if(!!err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function help() {
    console.log('[Usage] node xsdrun [xsd_file_1,xsd_file_2...]');
}