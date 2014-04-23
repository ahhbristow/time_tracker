
// ========================== UTILITIES ======================================
function toggle(dom_element, display) {
	console.log("Toggling: Old display: " + dom_element.style.display + ", New display: " + display);
	if (dom_element.style.display != display) {
		dom_element.style.display = display;
	} else {
		dom_element.style.display = "none";
	}
}

function format_date(date) {
	return date.getDate() + "_" + date.getMonth() + "_" + date.getFullYear();
}

function print_date(date) {

	var date_parts = date.split("_");
	var date_obj = new Date(date_parts[2],date_parts[1],date_parts[0]);

	var pretty_date = date_obj.toDateString();
	return pretty_date;
}

function add_global_style(dom_doc,css) {
	var head, style;
	head = document.getElementsByTagName('head')[0];
	if (!head) {
		return;
	}
	style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = css;
	head.appendChild(style);
}


function dump_storage() {
	var values = GM_listValues();

	for (var i = 0; i < values.length; i++) {
		var text = GM_getValue(values[i]);
		console.log(values[i] + "," + text);
	}
	//for (var val in GM_listValues()) {
	//var text = GM_getValue(val);
	//console.log(val + ", " + text);
	//}

	//console.log(values);
}


// ================= Persistence Layer ================================

function PersistenceLayer(use_local_storage) {
	this.use_local_storage = use_local_storage;
}

PersistenceLayer.prototype.set_value = function(key, value) {
	if (this.use_local_storage) {
		localStorage[key] = value;
	} else {
		GM_setValue(key, value);
	}

	return {status_value: 0};
}

PersistenceLayer.prototype.get_value = function(key) {
	if (this.use_local_storage) {
		var value = localStorage[key]
	} else {
		var value = GM_getValue(key);
	}
	return {status_value: 0, return_value: value};
}

PersistenceLayer.prototype.get_keys = function(key) {
	if (this.use_local_storage) {
		var keys = [];
		for(var k in localStorage) keys.push(k);
	} else {
		var keys = GM_listValues();
	}
	return keys;
}


PersistenceLayer.prototype.delete_value = function(key) {
	if (this.use_local_storage) {
		localStorage.removeItem(key);
	} else {
		GM_deleteValue(key);
	}
	return {status_value: 0};
}

/*
 * Queries the storage to find all the projects.  When using GM, these are stored as
 * key value pairs like this:
 *    key   = "tt:project:[PROJECT_ID]"
 *    value = "project_name|project_date|project_time" 
 */
PersistenceLayer.prototype.get_projects = function() {

	var keys = this.get_keys();
	console.log("KEYS: " + keys);
	var projects = [];
	for (var i = 0; i < keys.length; i++) {

		// Tokenize the key
		var key       = keys[i];
		var key_parts = key.split("|");
		var id        = key_parts[2];

		// This is a project so we should retrive
		if (key_parts[0] === "tt" && key_parts[1] === "project") {
	
			var project_data = this.get_value(key)['return_value'];

			// Parse the project data, pipe separated
			var data_parts = project_data.split("|");
			
			// If the data doesn't have three parts, something
			// has gone wrong so just return an error
			if (data_parts.length != 3 || !this.is_valid_project(project_data)) {
				console.log("PersistenceLayerError: Invalid project value");
				return {status_code: 1, return_value: ""};
			}

			var name = data_parts[0];
			var date = data_parts[1];
			var time = data_parts[2];

			// Build a 'row' to add to the 'result'
			// This is NOT a TimeTracker Project object
			var project = {
				'id'  : id,
				'name': name,
				'date': date,
				'time': time
			};

			projects.push(project);
		}	
	}
	return {status_code: 0, return_value: projects};
}

/*
 *
 */
PersistenceLayer.prototype.insert_project = function(project) {
	// Get a serial for it
	var id = this.get_next_project_serial();

	// Create the storage string
	var key   = "tt|project|" + id;
	var value = project.name + "|" + project.date + "|" + project.time;

	// TODO: Check it doesn't already exist
	this.set_value(key,value);

	console.log("PL: Inserting (" + key + "," + value + ")");
}

/*
 * TODO:  Add success/fail return
 */
PersistenceLayer.prototype.update_project = function(project) {
	
	// Just create a new value and write it
	var key   = "tt|project|" + project.id;
	var value = project.name + "|" + project.date + "|" + project.time;
	this.set_value(key,value);
	
}

/*
 *
 */
PersistenceLayer.prototype.remove_project = function(project_id) {
	var key = "tt|project|" + project_id;
	
	// TODO: Catch any errors here
	this.delete_value(key);
}

/*
 * Validates if a row in the storage is valid using a regexp
 */
PersistenceLayer.prototype.is_valid_project = function(project) {

	return 1;
}

/*
 * Delete everything
 */
PersistenceLayer.prototype.clear_projects = function() {

	var keys = this.get_keys();
	for (var i=0, key=null; key=keys[i]; i++) {
		this.delete_value(key);
	}

	return {status_code: 0}
}

/*
 * Checks the existing projects and gets the next serial
 */
PersistenceLayer.prototype.get_next_project_serial = function() {
	var projects = this.get_projects()['return_value'];

	// Iterate over the projects and find the max ID
	// TODO:  Slightly inefficient.  Looping twice effectively
	
	var max_serial = 1;
	console.log("PL: Projects: " + projects.length);
	for (var i = 0; i < projects.length; i++) {
		var project = projects[i];

		console.log("PL: Project ID: " + project.id);
		if (project.id >= max_serial) {
			max_serial = parseInt(project.id) + 1;
		}
	}
	console.log("PL: Next serial: " + max_serial);
	return max_serial;
}


// =====================================================================
// TimeTracker class

function TimeTracker() {

	this.error_msgs = [];
	this.success_msgs = [];

	// Load all the saved projects
	this.reload_projects();
	
	// Builds an iframe to contain the app
	this.render_container();

	this.register_event_handlers();
	
	console.log("Initialised TimeTracker");

}

/*
 * Return a particular project from the list of projects
 */
TimeTracker.prototype.get_project = function(project_id) {
		
	for (date in this.dates) {
		// List of projects on this date
		var project_list = this.dates[date].projects;
		for (var i = 0; i < project_list.length; i++) {

			var project = project_list[i];
			if (project.id == project_id) {
				return project;
			}
		}
	}
}

// Delete all the projects and clear the DOM
// TODO:  Replace with project.delete();
TimeTracker.prototype.clear_projects = function () {

	var status_value = document.persistence_layer.clear_projects();
	this.reload_projects();

	// Check the status of the call to persistence layer
	if (status_value[0] == 0) {
		// This was successful
		return {status_value: 0, status_msg: "CLEAR_PROJECTS_SUCCESS"};
	} else { 
		return {status_value: 1, status_msg: "CLEAR_PROJECTS_FAIL"};
	}
}

// Initialises an empty date in this time_tracker
TimeTracker.prototype.init_date = function (date_string) {

	var displayed = 0;
	var today = new Date();
	if (date_string === format_date(today)) {
		displayed = 1;
	}

	var date = {
		'displayed': displayed,
		'projects': []
	};
	return date;
}


/*
 * Adds a new project to the tracker with the given project name.
 */
TimeTracker.prototype.add_new_project = function (project_name) {

	console.log("Adding project: " + project_name);

	// Create the new project object
	var time = 0;
	var date = new Date();
	date = date.getDate() + "_" + date.getMonth() + "_" + date.getFullYear();
	var project = new Project("", project_name, time, date);

	// Update TimeTracker global state
	project.insert();

	// Need to rebuild the model here
	this.reload_projects();

	return {status_value: 0}
}

/*
 *
 */
TimeTracker.prototype.delete_project = function(project_id) {

	var project = this.get_project(project_id);

	project.remove();

	this.reload_projects();

}

TimeTracker.prototype.get_projects = function() {

	// Retrieve a list of projects from storage
	var dates = {};

	var res = document.persistence_layer.get_projects();
	var rows = res['return_value'];
	
	console.log("Result set: " + res);

	for (var row_idx = 0; row_idx < rows.length; row_idx++) {
		
		
		var row = rows[row_idx];
		var id   = row['id'];
		var name = row['name'];
		var time = parseFloat(row['time']);
		var date = row['date'];
		var project = new Project(id,name,time,date);
		console.log("Adding project: " + project);
		
		// Init this date if not seen before
		if (!dates[date]) {
			dates[date] = this.init_date(date);
		}
	
	
		// Push project to both dates array and projects array.
		// Convenient for later
		dates[date].projects.push(project);
		//this.projects[id] = project;
	}

	return dates; 
}

/*
 * Retrieve all projects for this time tracker
 */
TimeTracker.prototype.reload_projects = function() {
	this.dates = this.get_projects();
}


// Check if the DB has been updated.
// TODO:  Currently always reloads.
TimeTracker.prototype.is_reload_required = function () {
	var reload;
	reload = 1;
	// Check the 'DB' to see if there is a new key.

	return reload;
}

TimeTracker.prototype.clear_msgs = function() {
	this.error_msgs = [];
	this.success_msgs = [];
}


// ================================== DOM Functions ===============================


// Create a DOM element for a project and add to the time tracker.
TimeTracker.prototype.add_project_DOM = function (project, date) {

	var project_html = project.get_dom_object();

	// Add it to this TimeTracker project list DOM object
	var id = '#projects_' + date;
	$(id).append(project_html);
}


// Redraw just the centre container
TimeTracker.prototype.render = function () {

	// Re-render the project list
	$('#projects').html('');
	var project_list_html = this.get_project_list_html();
	$('#projects').append(project_list_html);


	// Do we have any messages to display?
	$('#time_tracker_controls').append(this.get_msgs_html());

	// Add message animations
	//$(".msg" ).fadeOut( 4000, function() {
		// Animation complete.
	//});

	setTimeout(function() {
		$(".msg").fadeOut(500, function() {});
	},200);

}

// TODO: Convert to jQuery
// Generate all the DOM for the tracker
TimeTracker.prototype.get_tracker_html = function () {

	// Unbind event handlers

	console.log("Rendering");
	var html = '';
	html += '   <div id="centre_container">';
	
	html += '      <div id="msgs">';
	html += this.get_msgs_html();
	html += '      </div>';


	// Render project_list
	html += '<div id="projects">';
	html += this.get_project_list_html();
	html += '</div>';

	html += '      <div id="time_tracker_controls">';
	html += '         <p>Add new project:</p>';
	html += '         <input id="new_project_name" value="" />';
	html += '         <button id="add_project">+</button>';
	html += '         <button id="clear_projects">Clear All</button>';
	html += '      </div>';
	html += '   </div>';

	return html;

}

// Only called on startup.  Renders the main container
TimeTracker.prototype.render_container = function () {

	// Create the app HTML inside the iframe
	html = this.get_tracker_html();
	$('#time_tracker').append(html);
}

// TODO: Convert to jQuery
// Get an object to contain all projects for a particular date
// It'll only be expanded if it matches today's date
TimeTracker.prototype.get_project_list_html = function () {

	var html = '';
	// For each date, generate list of projects
	for (date in this.dates) {

		if (this.dates[date].displayed == 1) {
			html += '<div id="projects_date_container_' + date + '" class="projects_date_container expanded">';
		} else {
			
			html += '<div id="projects_date_container_' + date + '" class="projects_date_container">';
		}
		html += '   <h3 class="projects_date" data-date="' + date + '">';
		html += '      <span>' + print_date(date) + '</span>';
		html += '   </h3>';

		var today = new Date();
		var today = today.getDate() + "_" + today.getMonth() + "_" + today.getFullYear();

		if (this.dates[date].displayed == 1) {
			html += '   <div id="projects_' + date + '" class="projects" data-date="' + date + '">';
		} else {
			html += '   <div id="projects_' + date + '" class="projects hidden" data-date="' + date + '">';
		}

		// List of projects on this date
		var project_list = this.dates[date].projects;
		for (var i = 0; i < project_list.length; i++) {
			html += project_list[i].get_html();
		}
		html += '   </div>';
		html += '</div>';
	}
	return html;
}


TimeTracker.prototype.get_msgs_html = function() {
	
	var html = '';
	for (var i = 0; i < this.success_msgs.length; i++) {
		var msg = this.success_msgs[i];

		html += '<div class="msg success"><span>' + msg + '</span></div>';
	}
	
	for (var i = 0; i < this.error_msgs.length; i++) {
		var msg = this.error_msgs[i];

		html += '<div class="msg error">' + msg + '</div>';
	}


	return html;
}


/*
 * Register all the DOM event handlers.  These are just basic handlers
 * that call functions in the TimeTracker controller.
 */
TimeTracker.prototype.register_event_handlers = function () {

	// Add time to a project
	var time_tracker = this;
	$(document).on('click', '.add_time', function () {
		var project_id = $(this).attr('data-project_id');
		console.log("Add Time to project: " + project_id);
		time_tracker.handle_increment_time(project_id);

	});

	// Subtract time from a project
	var time_tracker = this;
	$(document).on('click', '.subtract_time', function () {
		var project_id = $(this).attr('data-project_id');
		console.log("Subtract Time from project: " + project_id);
		time_tracker.handle_decrement_time(project_id);
	});

	// Expand/collapse a particular date's project list
	$(document).on('click', '.projects_date', function () {
		var date = $(this).attr('data-date');
		time_tracker.handle_date_expand(date);
	});

	// Add a new project to the TimeTracker
	$(document).on('click', '#add_project', function () {
		var project_name = $("#new_project_name").val();
		time_tracker.handle_add_project(project_name);
	});
	
	// Remove project
	$(document).on('click', '.remove_project', function () {
		var project_id = $(this).attr('data-project_id');
		console.log("Remove project: " + project_id);
		time_tracker.handle_delete_project(project_id);
	});

	// Remove all projects from the TimeTracker
	$(document).on('click', '#clear_projects', function () {
		time_tracker.handle_clear_projects();
	});

	// Expand/collapse the TimeTracker
	$(document).on('click', '#time_tracker_expand', function () {
		$('#time_tracker').toggle();
	});
}




// =========================== Project MODEL ==========================================

function Project(id, name, time, date) {
	this.id = id;
	this.name = name;
	this.time = time;
	this.date = date;

	var dom_obj;
}

Project.prototype.set_time = function () {}

Project.prototype.get_time = function () {
	return this.time
}

Project.prototype.set_name = function () {}

Project.prototype.get_name = function () {}

Project.prototype.increment_time = function () {
	this.time += 0.25;
	this.update();
}

Project.prototype.decrement_time = function () {
	this.time -= 0.25;
	this.update();
}

/*
 * Attempt to write a project to storage.  Return an error if any of the values
 * already exist
 */
Project.prototype.update = function () {
	document.persistence_layer.update_project(this);
}

Project.prototype.insert = function () {
	document.persistence_layer.insert_project(this);
	
}

Project.prototype.read = function () {
	var id = this.id;
	this.name = document.persistence_layer.get_value("project_name_" + id);
	this.time = Number(document.persistence_layer.get_value("project_time_" + id));
	this.date = document.persistence_layer.get_value("project_date_" + id);

}

Project.prototype.remove = function () {
	var project_id = this.id;

	document.persistence_layer.remove_project(project_id);
}


// ======================== Project VIEW ====================================

// Create a DOM element for a project and return it.
Project.prototype.get_html = function () {


	var html = '';
	html += '<div class="project clearfix">';
	html += '<span class="name">' + this.name + '</span>';

	html += '<div class="project_controls">';
	html += '<button class="time_button subtract_time" data-project_id="' + this.id + '">-</button>';
	html += '<span class="time">' + this.time + '</span>';
	html += '<button class="time_button add_time" data-project_id="' + this.id + '">+</button>';
	html += '</div>';
	html += '<button class="remove_project" data-project_id="' + this.id + '"><span>Delete</span></button>';
	html += '</div>';

	return html;
}


//========================== TimeTracker CONTROLLER ==========================

/*
 * These functions are the top level event handlers, and are called when
 * events are triggered.
 */

/*
 * Add a unit of time to Project with project_id
 */
TimeTracker.prototype.handle_increment_time = function (project_id) {

	console.log("handle_increment_time: " + project_id);

	// Read the project
	var project = this.get_project(project_id);

	// Update the model
	project.increment_time();

	// Re-render the TimeTracker
	this.render();
}

/*
 *  Subtract a unit of time from Project with project_id
 */
TimeTracker.prototype.handle_decrement_time = function (project_id) {

	// Read the project
	var project = this.get_project(project_id);

	// Update the model
	project.decrement_time();

	// Re-render the TimeTracker
	this.render();
}

/*
 * Event handler for clicking the expand button.  Toggles the display
 * of the TimeTracker
 */
TimeTracker.prototype.handle_date_expand = function (date) {

	// Toggle the display of this date object in the
	// TimeTracker
	var tracker_date = this.dates[date];
	if (tracker_date.displayed == 1) {
		tracker_date.displayed = 0;
	} else {
		tracker_date.displayed = 1;
	}

	$('#projects_date_container_' + date).toggleClass('expanded');
	$('#projects_' + date).slideToggle(200,null,{
		start: function() {
		}
	});

	// Re-render everything
	//this.render();
}

/*
 * TODO: Unit test
 */
TimeTracker.prototype.handle_add_project = function (project_name) {

	// Error if no name
	if (project_name == "") {
		this.error_msgs.push("ERR_NO_PROJ_NAME");
	} else {

		// Retrieve the values and create new project in model
		var ret = this.add_new_project(project_name);
		if (ret['status_value'] == 0) {
			this.success_msgs.push("Project added!");
		} else {
			this.error_msgs.push("Failed to add project");
		}

	}
	this.render();
	this.clear_msgs();
}

/*
 *
 */
TimeTracker.prototype.handle_delete_project = function (project_id) {
	this.delete_project(project_id);
	this.render();
}


/*
 *
 */
TimeTracker.prototype.handle_clear_projects = function () {

	var ret = this.clear_projects();

	if (ret['status_value'] == 0) {
		this.success_msgs.push("Cleared projects");
		console.log("Cleared projects");
	} else {
		this.error_msgs.push("Failed to clear projects");
		console.log("Failed to clear projects");
	}

	// Reload model and re-render
	this.reload_projects();
	this.render();

	// Remove the messages for this request
	this.clear_msgs();
}
