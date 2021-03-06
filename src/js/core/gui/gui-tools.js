/*
 * miniPaint - https://github.com/viliusle/miniPaint
 * author: Vilius L.
 */

import config from './../../config.js';
import Helper_class from './../../libs/helpers.js';
import Help_translate_class from './../../modules/help/translate.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';
import Base_gui_class from '../base-gui.js';

var instance = null;

/**
 * GUI class responsible for rendering left sidebar tools
 */
class GUI_tools_class {

	constructor(GUI_class) {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		this.Helper = new Helper_class();
		this.Help_translate = new Help_translate_class();
		this.Base_gui = new Base_gui_class();

		//active tool
		this.active_tool = 'brush';
		this.tools_modules = {};
	}

	load_plugins() {
		var _this = this;
		var ctx = document.getElementById('canvas_minipaint').getContext("2d");
		var plugins_context = require.context("./../../tools/", true, /\.js$/);
		plugins_context.keys().forEach(function (key) {
			if (key.indexOf('Base' + '/') < 0) {
				var moduleKey = key.replace('./', '').replace('.js', '');
				var classObj = plugins_context(key);
				_this.tools_modules[moduleKey] = new classObj.default(ctx);

				//init events once
				_this.tools_modules[moduleKey].load();
			}
		});
	}

	render_main_tools() {
		this.load_plugins();

		this.render_tools();
	}

	render_tools() {
		var target_id = "tools_container";
		var _this = this;
		var saved_tool = this.Helper.getCookie('active_tool');
		if(saved_tool == 'media') {
			//bringing this backby default gives bad UX
			saved_tool = null
		}
		if (saved_tool != null) {
			this.active_tool = saved_tool;
		}

		//left menu
		for (var i in config.TOOLS) {
			var item = config.TOOLS[i];

			var itemDom = document.createElement('span');
			itemDom.id = item.name;
			itemDom.title = item.title;
			if (item.name == this.active_tool) {
				itemDom.className = 'item trn active ' + item.name;
			}
			else {
				itemDom.className = 'item trn ' + item.name;
			}

			//event
			itemDom.addEventListener('click', function (event) {
				_this.activate_tool(this.id);
			});

			//register
			document.getElementById(target_id).appendChild(itemDom);
		}

		this.show_action_attributes();
		this.activate_tool(this.active_tool);
		this.Base_gui.check_canvas_offset();
	}

	activate_tool(key) {
		//reset last
		document.querySelector('#tools_container .' + this.active_tool)
			.classList.remove("active");

		//send exit event to old previous tool
		if (config.TOOL.on_leave != undefined) {
			var moduleKey = config.TOOL.name;
			var functionName = config.TOOL.on_leave;
			this.tools_modules[moduleKey][functionName]();
		}

		//change active
		this.active_tool = key;
		document.querySelector('#tools_container .' + this.active_tool)
			.classList.add("active");
		for (var i in config.TOOLS) {
			if (config.TOOLS[i].name == this.active_tool) {
				config.TOOL = config.TOOLS[i];
			}
		}

		//check module
		if (this.tools_modules[key] == undefined) {
			alertify.error('Tools class not found: ' + key);
			return;
		}

		//send activate event to new tool
		if (config.TOOL.on_activate != undefined) {
			var moduleKey = config.TOOL.name;
			var functionName = config.TOOL.on_activate;
			this.tools_modules[moduleKey][functionName]();
		}

		//set default cursor
		const mainWrapper = document.getElementById('main_wrapper');
		const defaultCursor = config.TOOL && config.TOOL.name === 'text' ? 'text' : 'default';
		if (mainWrapper.style.cursor != defaultCursor) {
			mainWrapper.style.cursor = defaultCursor;
		}

		this.show_action_attributes();
		this.Helper.setCookie('active_tool', this.active_tool);
		config.need_render = true;
	}

	action_data() {
		for (var i in config.TOOLS) {
			if (config.TOOLS[i].name == this.active_tool)
				return config.TOOLS[i];
		}

		//something wrong - select first tool
		this.active_tool = config.TOOLS[0].name;
		return config.TOOLS[0];
	}

	/**
	 * used strings: 
	 * "Fill", "Square", "Circle", "Radial", "Anti aliasing", "Circle", "Strict", "Burn"
	 */
	show_action_attributes() {
		var _this = this;
		var target_id = "action_attributes";

		const itemContainer = document.getElementById(target_id);

		itemContainer.innerHTML = "";

		const attributes = this.action_data().attributes;

		let itemDom;
		let currentButtonGroup = null;
		for (var k in attributes) {
			var item = attributes[k];

			var title = k[0].toUpperCase() + k.slice(1);
			title = title.replace("_", " ");

			if (typeof item == 'object' && typeof item.value == 'boolean' && item.icon) {
				if (currentButtonGroup == null) {
					currentButtonGroup = document.createElement('div');
					currentButtonGroup.className = 'ui_button_group no_wrap';
					itemDom = document.createElement('div');
					itemDom.className = 'item ' + k;
					itemContainer.appendChild(itemDom);
					itemDom.appendChild(currentButtonGroup);
				} else {
					itemDom.classList.add(k);
				}
			} else {
				itemDom = document.createElement('div');
				itemDom.className = 'item ' + k;
				itemContainer.appendChild(itemDom);
				currentButtonGroup = null;
			}

			if (typeof item == 'boolean' || (typeof item == 'object' && typeof item.value == 'boolean')) {
				//boolean - true, false

				let value = item;
				let icon = null;
				if (typeof item == 'object') {
					value = item.value;
					if (item.icon) {
						icon = item.icon;
					}
				}

				const element = document.createElement('button');
				element.className = 'trn';
				element.type = 'button';
				element.id = k;
				element.innerHTML = title;
				element.setAttribute('aria-pressed', value);
				if (icon) {
					element.classList.add('ui_icon_button');
					element.classList.add('input_height');
					element.innerHTML = icon;
					element.innerHTML = '<img alt="'+title+'" src="images/icons/'+icon+'" />';
				} else {
					element.classList.add('ui_toggle_button');
				}
				//event
				element.addEventListener('click', (event) => {
					//toggle boolean
					var new_value = element.getAttribute('aria-pressed') !== 'true';
					const actionData = this.action_data();
					const attributes = actionData.attributes;
					const id = event.target.closest('button').id;
					if (typeof attributes[id] === 'object') {
						attributes[id].value = new_value;
					} else {
						attributes[id] = new_value;
					}
					element.setAttribute('aria-pressed', new_value);
					if (actionData.on_update != undefined) {
						//send event
						var moduleKey = actionData.name;
						var functionName = actionData.on_update;
						this.tools_modules[moduleKey][functionName]({ key: id, value: new_value });
					}
				});

				if (currentButtonGroup) {
					currentButtonGroup.appendChild(element);
				} else {
					itemDom.appendChild(element);
				}
			}
			else if (typeof item == 'number' || (typeof item == 'object' && typeof item.value == 'number')) {
				//numbers
				let min = 1;
				let max = k === 'power' ? 100 : 999;
				let value = item;
				let step = null;
				if (typeof item == 'object') {
					value = item.value;
					if (item.min != null) {
						min = item.min;
					}
					if (item.max != null) {
						max = item.max;
					}
					if (item.step != null) {
						step = item.step;
					}
				}

				var elementTitle = document.createElement('label');
				elementTitle.innerHTML = title + ': ';
				elementTitle.id = 'attribute_label_' + k;

				const elementInput = document.createElement('input');
				elementInput.type = 'number';
				elementInput.setAttribute('aria-labelledby', 'attribute_label_' + k);
				const $numberInput = $(elementInput)
					.uiNumberInput({
						id: k,
						min,
						max,
						value,
						step: step || 1,
						exponentialStepButtons: !step
					})
					.on('input', () => {
						let value = $numberInput.uiNumberInput('get_value');
						const id = $numberInput.uiNumberInput('get_id');
						const actionData = this.action_data();
						const attributes = actionData.attributes;
						if (typeof attributes[id] === 'object') {
							attributes[id].value = value;
						} else {
							attributes[id] = value;
						}

						if (actionData.on_update != undefined) {
							//send event
							var moduleKey = actionData.name;
							var functionName = actionData.on_update;
							this.tools_modules[moduleKey][functionName]({ key: id, value: value });
						}
					});

				itemDom.appendChild(elementTitle);
				itemDom.appendChild($numberInput[0]);
			}
			else if (typeof item == 'object') {
				//select

				var elementTitle = document.createElement('label');
				elementTitle.innerHTML = title + ': ';
				elementTitle.for = k;

				var selectList = document.createElement("select");
				selectList.id = k;
				for (var j in item.values) {
					var option = document.createElement("option");
					if (item.value == item.values[j]) {
						option.selected = 'selected';
					}
					option.className = 'trn';
					option.name = item.values[j];
					option.value = item.values[j];
					option.text = item.values[j];
					selectList.appendChild(option);
				}
				//event
				selectList.addEventListener('change', (event) => {
					const actionData = this.action_data();
					actionData.attributes[event.target.id].value = event.target.value;
					this.show_action_attributes();

					if (actionData.on_update != undefined) {
						//send event
						var moduleKey = actionData.name;
						var functionName = actionData.on_update;
						this.tools_modules[moduleKey][functionName]({ key: event.target.id, value: event.target.value });
					}
				});

				itemDom.appendChild(elementTitle);
				itemDom.appendChild(selectList);
			}
			else if (typeof item == 'string' && item[0] == '#') {
				//color

				var elementTitle = document.createElement('label');
				elementTitle.innerHTML = title + ': ';
				elementTitle.for = k;

				var elementInput = document.createElement('input');
				elementInput.type = 'color';
				elementInput.id = k;
				elementInput.value = item;

				elementInput.addEventListener('keyup', (event) => {
					this.action_data().attributes[event.target.id] = event.target.value;
				});
				elementInput.addEventListener('change', (event) => {
					const actionData = this.action_data();
					actionData.attributes[event.target.id] = event.target.value;
					if (actionData.on_update != undefined) {
						//send event
						var moduleKey = actionData.name;
						var functionName = actionData.on_update;
						this.tools_modules[moduleKey][functionName]({ key: event.target.id, value: event.target.value });
					}
				});

				itemDom.appendChild(elementTitle);
				itemDom.appendChild(elementInput);
			}
			else {
				alertify.error('Error: unsupported attribute type:' + typeof item + ', ' + k);
			}
		}

		if (config.LANG != 'en') {
			//retranslate
			this.Help_translate.translate(config.LANG);
		}
	}

}

export default GUI_tools_class;
