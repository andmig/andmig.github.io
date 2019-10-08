(
    function(){
        const config = {
            jsonURI: "http://127.0.0.1/iab/macros-data.json"
            //jsonURI: "data/macros-data.json"
        }

        class IDGenerator{
            constructor(){
                // list of values generated during session - to assure true uniqueness
                this.sessionValues = [null,undefined];
                // store chars in arrays - mainly to reuse them for greater degree of randomization.
                // alpha array
                this.letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
                // hex chars
                this.hex = "0123456789ABCDEF".split("");
                // integers array
                this.ints = "1234567890".split("");
            }

            // gimmick - just implements UUID 8-4-4-4-12 octets convention with hex numbers.
            getUUID(allcaps = false){
                var populate = this.populate.bind(this);
                var values = this.hex;
                var list = [populate(8, values), populate(4, values), populate(4, values), populate(4, values), populate(12, values)].join("-");
                return allcaps ? list.toUpperCase() : list.toLowerCase();
            }

            // generates integer of any length - except for JS integer limitations.
            getInteger(length = 8){
                var list = [];
                // cannot start with zero
                while(!list[0]){
                    this.shuffle(this.ints);
                    list[0] = this.ints[0];
                }

                return this.populate(length, this.ints, list);
            }
            // radom alphabetical chars
            getString(length = 16, allcaps = false){
                let res = this.populate(length, this.letters);
                return allcaps ? res.toUpperCase() : res.toLowerCase();
            }

            /**
            * generates random string out of values
            * @param length - length of result
            * @param value - list of values used to get individial element value
            * @param list - optional array to pupulate
            **/
            populate(length, values, list = []){
                while(list.length < length){
                    this.shuffle(values);
                    list.push(values[0]);
                }
                var value = list.join("");
                while(this.sessionValues.includes(value)){
                    value = this.populate(length, values);
                }
                // store value globally
                this.sessionValues.push(value);
                return value;
            }

            // Fisher–Yates shuffle
            shuffle(input){
                if(input.length === 1) return input;
                for (let i = input.length - 1; i >= 0; i--){
                    let ri = ~~(Math.random() * (i + 1));
                    let iai = input[ri];
                    input[ri] = input[i];
                    input[i] = iai;
                }
            }

        }
        class Main{
            constructor(dependencies = {}){
                this.builder = dependencies.builder;
                this.config = dependencies.config;
                this.uids = dependencies.uids;
                this.init();

            }

            init(){
                if(document.readyState != "complete"){
                    window.addEventListener("load", () => {this.start()})
                }
                else{this.start()}
                this.loadData(this.config.jsonURI);
            }

            loadData(uri){
                fetch(uri)
                .then(response => response.json())
                .then(json => {this.json = json; this.start()});

            }

            start(){
                if(document.readyState == "complete" && this.json){
                    this.builder.build(this.json, this.uids);
                }
            }

        }

        class Builder{
            constructor(){
                this.data = null;
            }

            build(data, uids){
                data.categories.sort(
                    (a, b) => {
                        return a.index - b.index
                    }
                );
                data.macros.sort(
                    (a, b) => {
                        return a.name.localeCompare(b.name);
                    }
                );
                this.buildContent(data);
                this.buildTOC(data);
            }

            buildContent(data){
                let main = document.querySelector("main");
                let sections = [];
                let labelsMap = {};
                let labels = data.labels;
                for(let i in labels){
                    labelsMap[labels[i].property] = labels[i].label;
                }
                
                let categories = data.categories;
                let macros = data.macros;
                // restrict data display
                let displayColumns = [];
                for(let i in data.displaycolumns){
                    displayColumns.push(data.displaycolumns[i].column);
                }
                let subsections = [];
                // create sections
                for(let i in categories){
                    let item = categories[i];
                    let section = sections[item.index] = document.createElement("section");
                    let h2 = document.createElement("h2");
                    h2.id = ["section", item.name.toLowerCase().replace(/\s/g, "-")].join("-");;
                    h2.innerHTML = [item.index, ". ", item.name].join("");
                    section.appendChild(h2);
                    main.appendChild(section);
                    subsections[item.index] = 0;
                }

                // create content by appending related to sections macros info
                for(let i in macros){
                    let item = macros[i];
                    subsections[item.categoryindex]++;
                    // add subsection numbering
                    item.subsection = [item.categoryindex, ".", subsections[item.categoryindex]].join("");
                    let spec = document.createElement("div");
                    spec.setAttribute("macro-spec", "");
                    spec.id = ["macro-spec", item.name.toLowerCase()].join("-");
                    // determine if the item has possible values
                    let h3 = document.createElement("h3");
                    h3.innerText = [item.subsection, " [", item.name, "]"].join("");
                    let section = sections[item.categoryindex];
                    console.log("item.categoryindex", subsections[item.categoryindex])
                    section.appendChild(h3);
                    for(let p in item){
                        if(!displayColumns.includes(p)) continue;
                        let label = document.createElement("label");
                        label.innerHTML = labelsMap[p];
                        let desc = document.createElement("div");
                        let val = item[p];
                        switch(p){
                            case "name":
                            case "datatype":
                            case "introversion":
                            case "format":
                                let codeId, codeText = item[p];
                                if(p === "name") {
                                    codeId = ["macro-spec",item[p].toLowerCase()].join("-");
                                    codeText = ["[", item[p], "]"].join("");
                                };
                                desc.appendChild(this.codeWrapper(codeText, codeId));
                            break;
                            case "contexts":
                                let list = val.split(",");
                                let ul = document.createElement("ul");
                                for(let j in list){
                                    let li = document.createElement("li");
                                    li.innerHTML = list[j];
                                    ul.appendChild(li);
                                }
                                desc.appendChild(ul);
                            break;
                            case "values":
                                let values = data[item.name + "_values"];
                                if(values){
                                    let ul = document.createElement("ul");
                                    ul.setAttribute("macro-values", "")
                                    for(let v in values){
                                       // console.log(values[v].value, values[v].description);
                                        let li = document.createElement("li");
                                        let span = document.createElement("span");
                                        span.innerText = values[v].description ? ": " + values[v].description : "";
                                        li.appendChild(this.codeWrapper(values[v].value));
                                        li.appendChild(span); 
                                        ul.appendChild(li);
                                    }

                                    desc.appendChild(ul);
                                }
                               
                            break;
                            default:
                                desc.innerHTML = val;
                        } 
                        spec.appendChild(label);
                        spec.appendChild(desc);
                    }
                    section.appendChild(spec);
                }
            }

            buildTOC(data){
                let nav = document.querySelector("nav");
                let sections = [];
                let ol = document.createElement("ol");

                let cats = data.categories;
                let macros = data.macros;
                let item, li;
                for(let c in cats){
                    item = cats[c];
                    li = document.createElement("li");
                    let h3 = document.createElement("h3");
                    let a = document.createElement("a");
                    let href = a.href = ["#section", item.name.toLowerCase().replace(/\s/g, "-")].join("-");
                    a.innerText = [item.index, ". "].join("");
                    let an = document.createElement("a");
                    an.href = href;
                    an.innerText = item.name;
                    h3.appendChild(a);
                    h3.appendChild(an);
                    li.appendChild(h3);
                    let group = sections[item.index] = document.createElement("ul");
                    li.appendChild(group);
                    ol.appendChild(li);
                   
                }

                for(let m in macros){
                    item = macros[m];
                    let macro = item.name;
                    let index = item.categoryindex;
                    let container = sections[index];
                    let line = document.createElement("li");
                    let link = document.createElement("a");
                    link.href = ["#macro","spec", macro.toLowerCase()].join("-");
                    let num = document.createElement("span");
                    num.innerText = item.subsection;
                    let text = document.createElement("span");
                    text.innerText = ["[", macro, "]"].join("");
                   // link.innerText = [item.subsection, " [", macro, "]"].join("");
                    link.appendChild(num);
                    link.appendChild(text);
                    line.appendChild(link);
                    container.appendChild(line);

                }
                nav.appendChild(ol);
            }

            codeWrapper(text, id){
                let code = document.createElement("code");
                code.innerText = text;
                if(id) code.id = id;
                return code;
            }

        }

        const dependencies = {
            builder: new Builder(),
            uids: new IDGenerator(),
            config: config
        }

        new Main(dependencies);
        
       
    }());