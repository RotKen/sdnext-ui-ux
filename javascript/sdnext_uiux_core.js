// Originally from Anapnoe@https://github.com/anapnoe/stable-diffusion-webui-ux/blob/8307896c59032a9cdac1ab24c975102ff9a674d3/extensions-builtin/anapnoe-sd-uiux/javascript/anapnoe_sd_uiux_core.js

localStorage.setItem('UiUxReady', "false");

const template_path = './file=extensions/sdnext-ui-ux/html/templates/';
const uiux_app_id = "#sdnext_app";
const uiux_tab_id = "#tab_sdnext_uiux_core";
const console_js_id = "#console-log-js";

const split_instances = [];
let total = 0;
let active_main_tab;
let loggerUiUx;
let appUiUx;


//======================= UTILS =======================
function logPrettyPrint() {
	var output = "", arg, i;
		
	output += `<div class="log-row"><span class="log-date">${new Date().toLocaleString().replace(',','')}</span>`;
	
	for (i = 0; i < arguments.length; i++) {
		arg = arguments[i];
		if (arg === undefined) {
			arg = "undefined";
		}
		const argstr = arg.toString().toLowerCase();
		let acolor = "";

		if (argstr.indexOf("remove") !== -1 || argstr.indexOf("error") !== -1) {
			acolor += " log-remove";
		} else if (argstr.indexOf("loading") !== -1 
				|| argstr.indexOf("| ref") !== -1 
				|| argstr.indexOf("initial") !== -1 
				|| argstr.indexOf("optimiz") !== -1 
				|| argstr.indexOf("python") !== -1  
				|| argstr.indexOf("success") !== -1) {
			acolor += " log-load";
		} else if (argstr.indexOf("[") !== -1) {            
			acolor += " log-object";
		}

		if (arg.toString().indexOf(".css") !== -1 || arg.toString().indexOf(".html") !== -1) {
			acolor += " log-url";
		} else if (arg.toString().indexOf("\n") !== -1) {
			output += "<br />";
		}

		output += `<span class="log-${(typeof arg)} ${acolor}">`;              
		
		if (typeof arg === "object" && typeof JSON === "object" && typeof JSON.stringify === "function") {
			output += JSON.stringify(arg);   
		} else {
			output += arg;   
		}

		output += " </span>";
	}

	output += "</div>";

	return output;
}

async function getContributors(repoName, page = 1) {  
    let request = await fetch(`https://api.github.com/repos/${repoName}/contributors?per_page=100&page=${page}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    let contributorsList = await request.json();
    return contributorsList;
}

async function getAllContributorsRecursive(repoName, page = 1, allContributors = []) {
    const list = await getContributors(repoName, page);
    allContributors = allContributors.concat(list);

    if (list.length === 100) {
        return getAllContributorsRecursive(repoName, page + 1, allContributors);
    }

    return allContributors;
}

function showContributors(){
	const contributors_btn = document.querySelector('#contributors');
	const contributors_view = document.querySelector('#contributors_tabitem');
	const temp = document.createElement('div');
	temp.id = 'contributors_grid';
	temp.innerHTML = `<p>Kindly allow us a moment to retrieve the contributors. 
	We're grateful for the many individuals who have generously put their time and effort to make this possible.</p>`;
	temp.style.display = 'flex';
	temp.style.flexDirection = 'column';
	temp.style.justifyContent = 'center';
	temp.style.alignItems = 'center';	
	temp.style.height = '100%';
	contributors_view.append(temp);	

	contributors_btn.addEventListener('click', function(e) {
		if(!contributors_btn.getAttribute("data-visited")){
			contributors_btn.setAttribute("data-visited", "true");
			const promise = getAllContributorsRecursive("vladmandic/automatic");
			promise.then(function (result) {
				temp.innerHTML = "";
				temp.style = "";

				for (let i = 0; i < result.length; i++) {
					const login = result[i].login;
					const html_url = result[i].html_url;
					const avatar_url = result[i].avatar_url;					
					temp.innerHTML += `
					<a href="${html_url}" target="_blank" rel="noopener noreferrer nofollow" class="contributor-button flexbox col">
						<figure><img src="${avatar_url}" lazy="true"></figure>
						<div class="contributor-name">
							${login}
						</div>
					</a>`;
				}										
			})
		}
	});
}


//======================= MOBILE =======================
function detectMobile() {
    return (window.innerWidth <= 768);
}

function applyDefaultLayout(isMobile){
    appUiUx.querySelectorAll("[mobile]").forEach((tabItem) => {   
        if(isMobile){
            if(tabItem.childElementCount === 0){
                const mobile_attr = tabItem.getAttribute("mobile");              
                if(mobile_attr){
                    const mobile_target = appUiUx.querySelector(mobile_attr);      
                    if(mobile_target){
                        tabItem.setAttribute("mobile-restore", `#${mobile_target.parentElement.id}`);
                        tabItem.append(mobile_target);
                    }           
                }
            }
        }else{
            if(tabItem.childElementCount > 0){
                const mobile_restore_attr = tabItem.getAttribute("mobile-restore");              
                if(mobile_restore_attr){                  
                    const mobile_restore_target = appUiUx.querySelector(mobile_restore_attr);      
                    if(mobile_restore_target){
                        mobile_restore_target.append(tabItem.firstElementChild);
                    }           
                }
            }
        }           
    });

    if(isMobile){ 
        appUiUx.querySelector(".accordion-vertical.expand #mask-icon-acc-arrow")?.click();
        appUiUx.classList.add("default-mobile");
    }else{
        appUiUx.classList.remove("default-mobile");
    }
}

function switchMobile(){
    const optslayout = window.opts.uiux_default_layout;
    appUiUx.classList.add(`default-${optslayout.toLowerCase()}`);
    if(optslayout === "Auto"){           
        window.addEventListener('resize', function(event){
            const isMobile = detectMobile();
            applyDefaultLayout(isMobile);
        });
        applyDefaultLayout(detectMobile());

    }else if(optslayout === "Mobile"){
        applyDefaultLayout(true);
    }else{
        applyDefaultLayout(false);
    }   
}


//======================= UIUX READY =======================
function mainTabs(element, tab) {
	const new_tab = document.querySelector(tab);

	if(new_tab) {
		if (active_main_tab) {
			active_main_tab.style.display = 'none';
		}
		new_tab.style.display = 'block';
		active_main_tab = new_tab;
	}
}

function uiuxOptionSettings() {
    // settings max output resolution
    function sdMaxOutputResolution(value) {
        gradioApp().querySelectorAll('[id$="2img_width"] input,[id$="2img_height"] input').forEach((elem) => {
            elem.max = value;
        })
    }
    gradioApp().querySelector("#setting_uiux_max_resolution_output").addEventListener('input', function (e) {
        let intvalue = parseInt(e.target.value);
        intvalue = Math.min(Math.max(intvalue, 512), 16384);
        sdMaxOutputResolution(intvalue);					
    })	
    sdMaxOutputResolution(window.opts.uiux_max_resolution_output);

	// settings input ranges
	function uiux_show_input_range_ticks(value, interactive) {
		if (value) {
			const range_selectors = "input[type='range']";
			gradioApp()
				.querySelectorAll(range_selectors)
				.forEach(function (elem) {
					let spacing = (elem.step / (elem.max - elem.min)) * 100.0;
					let tsp = "max(3px, calc(" + spacing + "% - 1px))";
					let fsp = "max(4px, calc(" + spacing + "% + 0px))";
					var style = elem.style;
					style.setProperty(
						"--ae-slider-bg-overlay",
						"repeating-linear-gradient( 90deg, transparent, transparent " +
						tsp +
						", var(--ae-input-border-color) " +
						tsp +
						", var(--ae-input-border-color) " +
						fsp +
						" )"
					);
				});
		} else if (interactive) {
			gradioApp()
				.querySelectorAll("input[type='range']")
				.forEach(function (elem) {
					var style = elem.style;
					style.setProperty("--ae-slider-bg-overlay", "transparent");
				});
		}
	}
	gradioApp().querySelector("#setting_uiux_show_input_range_ticks input").addEventListener("click", function (e) {
		uiux_show_input_range_ticks(e.target.checked, true);
	});
	uiux_show_input_range_ticks(window.opts.uiux_show_input_range_ticks);
    
	// settings looks
	function setupUiUxSetting(settingId, className) {
		function updateUiUxClass(className, value) {
			if (value) {
				appUiUx.classList.add(className);
			} else {
				appUiUx.classList.remove(className);
			}
		}
		gradioApp().querySelector(`#${settingId} input`).addEventListener("click", function (e) {
			updateUiUxClass(className, e.target.checked);
		});
		updateUiUxClass(className, window.opts[settingId]);
	}

	setupUiUxSetting("setting_uiux_no_slider_layout", "no-slider-layout");
	setupUiUxSetting("setting_uiux_show_labels_aside", "aside-labels");
	setupUiUxSetting("setting_uiux_show_labels_main", "main-labels");
	setupUiUxSetting("setting_uiux_show_labels_tabs", "tab-labels");
	setupUiUxSetting("setting_uiux_show_labels_control", "control-labels");
    
	// settings mobile
    const comp_mobile_scale_range = gradioApp().querySelector("#setting_uiux_mobile_scale input[type=range]");
    comp_mobile_scale_range.classList.add("hidden");
    const comp_mobile_scale = gradioApp().querySelector("#setting_uiux_mobile_scale input[type=number]");

    function uiux_mobile_scale(value) {
        const viewport = document.head.querySelector('meta[name="viewport"]');
        viewport.setAttribute("content", `width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=${value}`);      
    }
    comp_mobile_scale.addEventListener("change", function (e) { 
        //e.preventDefault();
        //e.stopImmediatePropagation()
        comp_mobile_scale.value = e.target.value;
        window.updateInput(comp_mobile_scale);
        console.log('change', e.target.value);
        uiux_mobile_scale(e.target.value);   
    });
    uiux_mobile_scale(window.opts.uiux_mobile_scale);
}

function setupGenerateObservers() {
	const keys = ["#txt2img", "#img2img", "#control"]; //added control
	keys.forEach((key) => {
	 
		const tib = document.querySelector(key+'_interrupt');
		const tgb = document.querySelector(key+'_generate');
		const ti = tib.closest('.portal');
		const tg = tgb.closest('.ae-button');
		const ts = document.querySelector(key+'_skip').closest('.portal');
		const loop = document.querySelector(key+'_loop');

		tib.addEventListener("click", function () {
			loop.classList.add('stop');
		});

		const gen_observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (m) {

		// 		if (tib.style.display === 'none') {

		// 			if (loop.className.indexOf('stop') !== -1 || loop.className.indexOf('active') === -1) {
		// 				loop.classList.remove('stop');
		// 				ti.classList.add('disable');
		// 				ts.classList.add('disable');
		// 				tg.classList.remove('active');
		// 			} else if (loop.className.indexOf('active') !== -1) {
		// 				tgb.click();
		// 			}
		// 		} else {
		// 			ti.classList.remove('disable');
		// 			ts.classList.remove('disable');
		// 			tg.classList.add('active');
		// 		}
				/* The above does not work with SDnext process */
				if (tgb.textContent && !tgb.querySelector('span')) {
					ti.classList.remove('disable');
					ts.classList.remove('disable');
					tg.classList.add('active');
					const span = document.createElement('span');
					const icon = document.createElement('div')
					icon.classList.add('mask-icon','icon-generate')
					span.textContent = tgb.textContent;	
					tgb.textContent = ''; 	// removes the text content from the button ('invisible' style hides the font regardless)
					if (span.textContent === "Generate"){
						tgb.appendChild(icon)
						ti.classList.add('disable');
						ts.classList.add('disable');
						tg.classList.remove('active');
					} 
					tgb.appendChild(span);
				} 
				/*replaces the original code to achieve the same result, re-adds the 'disable' style and removes the 'active' once generation is finished */
		 	});
		});
		
		
		// gen_observer.observe(tib, { attributes: true, attributeFilter: ['style'] }); unneeded with new process
		gen_observer.observe(tgb, { childList: true, subtree: true });
	});
}

function attachLoggerScreen() {
	const logger_screen = document.querySelector("#logger_screen");
	if(logger_screen){
		document.querySelector(console_js_id)?.append(loggerUiUx);
		logger_screen.remove();
	}
}

//======================= SETUP =======================
function setAttrSelector(parent_elem, content_div, count, index, length) {

	//const t = parent_elem.getAttribute("data-timeout");
	//const delay = t ? parseInt(t) : 0;
	
	//setTimeout(() => {

	const mcount = count % 2;
	//const parent_elem = this.el;

	const s = parent_elem.getAttribute("data-selector");
	const sp = parent_elem.getAttribute("data-parent-selector");
	

	let target_elem;
	
	switch (mcount) {
		case 0:
			target_elem = document.querySelector(`${sp} ${s}`);
			break;
		case 1:
			target_elem = content_div.querySelector(`${s}`);
			break;
	}

	if (target_elem && parent_elem) {
		parent_elem.append(target_elem);  
		total += 1;
		console.log("register | Ref", index, sp, s);
		const d = parent_elem.getAttribute('droppable');

		if (d) {
			const childs = Array.from(parent_elem.children);
			//console.log("droppable", target_elem, parent_elem, childs);
			childs.forEach((c) => {
				if (c !== target_elem) {
					if (target_elem.className.indexOf('gradio-accordion') !== -1) {
						target_elem.children[2].append(c);
					} else {
						target_elem.append(c);
					}
				}
			});
		}

		const hb = parent_elem.getAttribute("show-button");
		if(hb){document.querySelector(hb)?.classList.remove("hidden");}

	} else if (count < 4) {

		const t = parent_elem.getAttribute("data-timeout");
		const delay = t ? parseInt(t) : 500;
		
		setTimeout(() => {
			console.log( count + 1, "retry | ", delay, " | Ref", index, sp, s);
			setAttrSelector(parent_elem, content_div, count + 1, index, length);
		}, delay);

	} else {
		console.log("error | Ref", index, sp, s);
		if(window.opts.uiux_enable_console_log) {
			parent_elem.style.backgroundColor = 'pink'
		}
		total += 1;	

	}

	if(total === length){				
		localStorage.setItem('UiUxReady', true);
	}

	//}, delay );

}

function initDefaultComponents() {
	const content_div = appUiUx;

	content_div.querySelectorAll(`div.split`).forEach((el) => {

		let id = el.id;
		let nid = content_div.querySelector(`#${id}`);

		const dir = nid?.getAttribute('direction') === 'vertical' ? 'vertical' : 'horizontal';
		const gutter = nid?.getAttribute('gutterSize') || '8';

		const containers = content_div.querySelectorAll(`#${id} > div.split-container`);
		const len = containers.length;
		const r = 100 / len;
		const ids = [], isize = [], msize = [];

		for (let j = 0; j < len; j++) {
			const c = containers[j];
			ids.push(`#${c.id}`);
			const ji = c.getAttribute('data-initSize');
			const jm = c.getAttribute('data-minSize');
			isize.push(ji ? parseInt(ji) : r);
			msize.push(jm ? parseInt(jm) : Infinity);
		}

		console.log("Split component", ids, isize, msize, dir, gutter);

		split_instances[id] = Split(ids, {
			sizes: isize,
			minSize: msize,
			direction: dir,
			gutterSize: parseInt(gutter),
			snapOffset: 0,
			dragInterval: 1,
			//expandToMin: true,         
			elementStyle: function (dimension, size, gutterSize) {
				//console.log(dimension, size, gutterSize);
				return {
					'flex-basis': 'calc(' + size + '% - ' + gutterSize + 'px)',
				}
			},
			gutterStyle: function (dimension, gutterSize) {
				return {
					'flex-basis': gutterSize + 'px',
					'min-width': gutterSize + 'px',
					'min-height': gutterSize + 'px',
				}
			},
		});

	});
	
	content_div.querySelectorAll(`.portal`).forEach((el, index, array) => {
		setAttrSelector(el, content_div, 0, index, array.length);
	});

	content_div.querySelectorAll(`.accordion-bar`).forEach((c) => {
		const acc = c.parentElement;
		const acc_split = acc.closest('.split-container');

		let ctrg = c;
		const atg = acc.getAttribute('iconTrigger');
		if (atg) {
			const icn = content_div.querySelector(atg);
			if (icn) {
				ctrg = icn;
				c.classList.add('pointer-events-none');
			}
		}

		if (acc.className.indexOf('accordion-vertical') !== -1 && acc_split.className.indexOf('split') !== -1) {

			acc.classList.add('expand');
			//const acc_gutter = acc_split.previousElementSibling;
			const acc_split_id = acc_split.parentElement.id;
			const split_instance = split_instances[acc_split_id];
			acc_split.setAttribute('data-sizes', JSON.stringify(split_instance.getSizes()));

			ctrg?.addEventListener("click", () => {
				acc.classList.toggle('expand');
				//acc_gutter.classList.toggle('pointer-events-none');
				if (acc_split.className.indexOf('v-expand') !== -1) {
					acc_split.classList.remove('v-expand');
					acc_split.style.removeProperty("min-width");
					split_instance.setSizes(JSON.parse(acc_split.getAttribute('data-sizes')))
				} else {
					acc_split.classList.add('v-expand');
					let sizes = split_instance.getSizes();
					acc_split.setAttribute('data-sizes', JSON.stringify(sizes));

					//console.log(sizes)
					if (acc.className.indexOf('left') !== -1) {
						sizes[sizes.length-1] = 100;
						sizes[sizes.length-2] = 0;
					} else {
						sizes[sizes.length-1] = 0;
						sizes[sizes.length-2] = 100;
					}

					const padding = parseFloat(window.getComputedStyle(c, null).getPropertyValue('padding-left')) * 2;
					acc_split.style.minWidth = c.offsetWidth+padding+"px";

					split_instance.setSizes(sizes)
				}
			});

		} else {
			ctrg?.addEventListener("click", () => { acc.classList.toggle('expand') });
		}
	});


	function callToAction(el, tids, pid) {

		const acc_bar = el.closest(".accordion-bar");
		if (acc_bar) {
			const acc = acc_bar.parentElement;
			if (acc.className.indexOf('expand') === -1) {
				let ctrg = acc_bar;
				const atg = acc.getAttribute('iconTrigger');
				if (atg) {
					const icn = content_div.querySelector(atg);
					if (icn) {
						ctrg = icn;
					}
				}
				ctrg.click();
			}
		}

		const txt = el.querySelector('span')?.innerHTML.toLowerCase();
		//console.log(txt, pid)
		if (txt && pid) {				
			document.querySelectorAll(`${pid} .tab-nav button, [data-parent-selector="${pid}"] .tab-nav button`).forEach(function (elm) {
				/* console.log(elm.innerHTML, txt) */
				if (elm.innerHTML.toLowerCase().indexOf(txt) !== -1) {
					elm.click();
				}
			});
		}

        
	}

	content_div.querySelectorAll(`.xtabs-tab`).forEach((el) => {

		el.addEventListener('click', () => {
			const tabParent = el.parentElement;
			const tgroup = el.getAttribute("tabGroup");
			const pid = el.getAttribute("data-click");

			function hideActive(tab) {
				tab.classList.remove('active');
				const tids = tab.getAttribute("tabItemId");
				appUiUx.querySelectorAll(tids).forEach((tabItem) => {
					//tabItem.classList.add('hidden');
					tabItem.classList.remove('fade-in');
					tabItem.classList.add('fade-out');
				});
			}

			if (tgroup) {
				appUiUx.querySelectorAll(`[tabGroup="${tgroup}"]`)
					.forEach((tab) => {
						if (tab.className.indexOf('active') !== -1) {
							hideActive(tab);
						}
					});

			} else if (tabParent) {
				const tabs = [].slice.call(tabParent.children);
				tabs.forEach((tab) => {
					if (tab.className.indexOf('active') !== -1) {
						hideActive(tab);
					}
				});
			}

			const tids = el.getAttribute("tabItemId");
			appUiUx.querySelectorAll(tids).forEach((tabItem) => {
				//tabItem.classList.remove('hidden');
				tabItem.classList.remove('fade-out');
				tabItem.classList.add('fade-in');
				//console.log('tab', tids, tabItem);
			});

			el.classList.add('active');
			callToAction(el, tids, pid);

		});

		const active = el.getAttribute("active");
		if (!active) {
			const tids = el.getAttribute("tabItemId");
			appUiUx.querySelectorAll(tids).forEach((tabItem) => {
				//tabItem.classList.add('hidden');
				tabItem.classList.remove('fade-in');
				tabItem.classList.add('fade-out');
			});
		}

	});

	content_div.querySelectorAll(`.xtabs-tab[active]`).forEach((el) => {
		el.classList.add('active');
		const tids = el.getAttribute("tabItemId");
		const pid = el.getAttribute("data-click");
		appUiUx.querySelectorAll(tids).forEach((tabItem) => {
			//tabItem.classList.remove('hidden');
			tabItem.classList.remove('fade-out');
			tabItem.classList.add('fade-in');
		});
		callToAction(el, tids, pid);
		//console.log('tab', tids, el);
	});

	content_div.querySelectorAll(`.ae-button`).forEach((el) => {
		const toggle = el.getAttribute("toggle");
		const active = el.getAttribute("active");
		const input = el.querySelector('input');

		if (input) {
			if (input.checked === true && !active) {
				input.click();
			} else if (input.checked === false && active) {
				input.click();
			}
		}

		if (active) {
			el.classList.add('active');
		} else {
			el.classList.remove('active');
		}


		if (toggle) {
			el.addEventListener('click', (e) => {					
				const input = el.querySelector('input');				
				if (input) {
					input.click();
					if (input.checked === true) {
						el.classList.add('active');
					} else if (input.checked === false) {
						el.classList.remove('active');
					}
				} else {
					el.classList.toggle('active');
				}
			});
		}

		const adc = el.getAttribute("data-click");
		if(adc){
			el.addEventListener('click', (e) => {

					if(el.className.indexOf("refresh-extra-networks") !== -1){						
					const ctemp = el.closest(".template");
					const ckey = ctemp?.getAttribute("key") || "txt2img";
					//console.log(ckey);
					setTimeout(() => {
						const tempnet = document.querySelector(`#txt2img_temp_tabitem #${ckey}_cards`);
						if(tempnet){
							ctemp.querySelector(".extra-network-cards")?.remove();
							ctemp.querySelector(".extra-network-subdirs")?.remove();
							ctemp.querySelectorAll(`.portal`).forEach((el, index, array) => {
								setAttrSelector(el, ctemp, 0, index, array.length);
							});
							updateExtraNetworksCards(ctemp);
						}
					}, 1000);
					
				}

				//}else{
					document.querySelectorAll(adc).forEach((el) => {
						el.click();
					})	
				//}
			})
		}

	});
	
	// try to attach LoggerScreen to main before full UIUXReady
	attachLoggerScreen();
}

function waitForUiUxReady() {
	return new Promise((resolve, reject) => {
		const interval = setInterval(() => {
			if (localStorage.getItem('UiUxReady') === "true") {
				clearInterval(interval);
				resolve();
			}
		}, 500);
	});
}

function setupScripts() {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.id = 'splitjs-main';
		script.setAttribute("data-scope", uiux_app_id);

		script.src = 'https://unpkg.com/split.js/dist/split.js';
		script.onload = resolve;
		script.onerror = reject;
		appUiUx.appendChild(script);
	});
}

function setupAnimationEventListeners(){
	const notransition = window.opts.uiux_disable_transitions;

	document.addEventListener('animationstart', (e) => {
		if (e.animationName === 'fade-in') {				
			e.target.classList.remove('hidden');
		}
		if (notransition && e.animationName === 'fade-out') {	
			e.target.classList.add("notransition");		
			e.target.classList.add('hidden');
		}
	});

	document.addEventListener('animationend', (e) => {
		if (e.animationName === 'fade-out') {				
			e.target.classList.add('hidden');
		}
	}); 
}

function createButtonsForExtensions() {
	const other_extensions = document.querySelector(`#other_extensions`);
	const other_views = document.querySelector(`#split-left`);

	const no_button_tabs = [
		"tab_txt2img", "tab_img2img", "tab_process", "tab_control", "tab_interrogate", "tab_train", "tab_models", "tab_extensions", "tab_system", "tab_image_browser",
    	"tab_ui_theme", "tab_anapnoe_dock",
    	"tab_sdnext_uiux_core"
	]

	const snakeToCamel = str => str.replace(/(_\w)/g, match => match[1].toUpperCase());

	document.querySelectorAll(`#tabs > .tabitem`).forEach((c) => {
		const cid = c.id;
		const nid = cid.split('tab_')[1];

		if(!no_button_tabs.includes(cid)) {
			const temp = document.createElement('div');

			temp.innerHTML= `
				<button 
					tabItemId="#split-app, #${cid}_tabitem" 
					tabGroup="main_group" 
					data-click="#tabs" 
					onclick="mainTabs(this, '#${cid}')" 
					class="xtabs-tab"
				>
					<div class="icon-letters">${nid.slice(0, 2)}</div>
					<span>${snakeToCamel(nid)}</span>
				</button>
			`;
			other_extensions.append(temp.firstElementChild);

			temp.innerHTML= `
				<div id="${cid}_tabitem" class="xtabs-item other">
					<div data-parent-selector="gradio-app" data-selector="#${cid} > div" class="portal">
					</div>
				</div>
			`;
			other_views.append(temp.firstElementChild);
		}
	});
}

//======================= TEMPLATES =======================
function replaceRootTemplate() {
	const content_div = document.querySelector(uiux_app_id);
	gradioApp().insertAdjacentElement('afterbegin', content_div);
	active_main_tab = document.querySelector("#tab_control");
	appUiUx = content_div;
}

function getNestedTemplates(container) {
	const nestedData = [];	
	container.querySelectorAll(`.template:not([status])`).forEach((el) => {
		const url = el.getAttribute('url');
		const key = el.getAttribute('key');
		const template = el.getAttribute('template');

		nestedData.push({
			url: url ? url : template_path,
			key: key ? key : undefined,
			template: template ? `${template}.html` : `${el.id}.html`,
			id: el.id
		});
	});
	return nestedData;
}

async function loadCurrentTemplate(data) {
	const curr_data = data.shift();

	if (curr_data) {
        let target;

        if (curr_data.parent) {
            target = curr_data.parent;
        } else if (curr_data.id) {
            target = document.querySelector(`#${curr_data.id}`);
        }

        if (target) {
			console.log('Loading template', curr_data.template);
			const response = await fetch(`${curr_data.url}${curr_data.template}`);

			if (!response.ok) {
				console.log('Failed to load template', curr_data.template);
				target.setAttribute('status', 'error');
			}
			else
			{
				const text = await response.text();
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = curr_data.key ? text.replace(/\s*\{\{.*?\}\}\s*/g, curr_data.key) : text;

				const nestedData = getNestedTemplates(tempDiv);
				data.push(...nestedData);

				target.setAttribute('status', 'true');
				target.append(tempDiv.firstElementChild);
			}

			return loadCurrentTemplate(data);
        }
    }

	return Promise.resolve();
}

async function loadAllTemplates() {
	const data = [
		{
			url: template_path,
			template: 'template-app-root.html',
			parent: document.querySelector(uiux_tab_id)
		}
	];

	await loadCurrentTemplate(data);
	console.log('Template files merged successfully');
}

function removeStyleAssets(){
	console.log("Starting optimizations");

	//Remove specific stylesheets
	document.querySelectorAll(`
		[rel="stylesheet"][href*="/assets/"], 
		[rel="stylesheet"][href*="theme.css"],
		[rel="stylesheet"][href*="file=style.css"]
	`).forEach(stylesheet => {
		stylesheet.remove();
		console.log("Removed stylesheet", stylesheet.getAttribute("href"));  
	});

	//Remove inline styles and svelte classes
	const stylers = document.querySelectorAll('.styler, [class*="svelte"]:not(input)');
	let count = 0;
	let removedCount = 0;

	stylers.forEach(element => {
		if (element.style.display !== "none" && element.style.display !== "block") {
			element.removeAttribute("style");
			removedCount++;
		}

		[...element.classList].filter(className => className.match(/^svelte.*/)).forEach(svelteClass => {
			element.classList.remove(svelteClass);
		});

		count++;
	});

	console.log("Removed inline styles and svelte classes from DOM elements:", "Total Elements:", count, "Removed Elements:", removedCount);
	console.log("Finishing optimizations");
}

//======================= INITIALIZATION =======================
function setFavicon() {
	let link = document.querySelector("link[rel~='icon']");
	if (!link) {
		link = document.createElement('link');
		link.rel = 'icon';
		document.head.appendChild(link);
	}
	link.href = './file=extensions/sdnext-ui-ux/html/favicon.svg';
}

function startLogger() {
	console.log(navigator.userAgent);

	console.log("==== SETTINGS ====");
    console.log("Debug log enabled: ", window.opts.uiux_enable_console_log);
    console.log("Maximum resolution output: ", window.opts.uiux_max_resolution_output);
    console.log("Ignore overrides: ", window.opts.uiux_ignore_overrides);
    console.log("Show ticks for input range slider: ", window.opts.uiux_show_input_range_ticks);
    console.log("Default layout: ", window.opts.uiux_default_layout);
    console.log("Disable transitions: ", window.opts.uiux_disable_transitions);
    console.log("Aside labels: ", window.opts.uiux_show_labels_aside);
    console.log("Main labels: ", window.opts.uiux_show_labels_main);
    console.log("Tabs labels: ", window.opts.uiux_show_labels_tabs);

	if(navigator.userAgent.toLowerCase().includes('firefox')){
		console.log("Go to the Firefox about:config page, then search and toggle layout. css.has-selector. enabled")
	}

    if(!window.opts.uiux_enable_console_log){
        console.log = function() {}
    }
}

function setupLogger() {
	//create logger
	const loggerScreen = document.createElement('div');
	loggerScreen.id = "logger_screen";
	loggerScreen.style = `
		position: fixed; 
		inset: 0; 
		background-color: black; 
		z-index: 99999;
		display: flex;
		flex-direction: column;
		overflow: auto;
	`;
	
	loggerUiUx = document.createElement('div');
	loggerUiUx.id = "logger";

	loggerScreen.append(loggerUiUx);
	document.body.append(loggerScreen);


	//override console.log
	const logger = document.getElementById("logger")

	console.old = console.log;
	console.log = function () {
		logger.innerHTML += logPrettyPrint(...arguments);
		console.old(...arguments);
	};
}

//======================= MAIN ROUTINE =======================
async function mainUiUx() {
	setupLogger();

	//INITIALIZATION
	console.log("Initialize SDNext UiUx");
	startLogger();

	setFavicon();
	removeStyleAssets();
	await loadAllTemplates();
	replaceRootTemplate();

	//SETUP
	console.log("Init runtime components");

	createButtonsForExtensions();
	setupAnimationEventListeners();
	await setupScripts();
	
	initDefaultComponents();
	await waitForUiUxReady();

	//UIUX READY
	console.log("Runtime components initialized");

	attachLoggerScreen();
	setupGenerateObservers();
	uiuxOptionSettings();
	showContributors();      
	switchMobile();

	//UIUX COMPLETE
	console.log("UiUx complete");
}

document.addEventListener("DOMContentLoaded", () => {
	const observer = new MutationObserver(() => {
		const block = gradioApp().querySelector(uiux_tab_id);			
		
		if (block && window.opts && Object.keys(window.opts).length) {
			observer.disconnect();
			setTimeout(() => {
				mainUiUx();
			}, 1000);
		}
	});
	observer.observe(gradioApp(), {childList: true, subtree: true});
});