// ==UserScript==
// @name         TimeTracker
// @namespace  
// @version      1.5
// @description  Modal window to track projects worked on by date     
// @match        http://tampermonkey.net/index.php?version=3.5.3630.14&ext=dhdg&updated=true
// @copyright    2012+, Shaun Bristow
// @include      *
// @noframes
// @require      http://code.jquery.com/jquery-1.10.2.min.js
// ==/UserScript==
//
//


// ===================================================================================
// Utilities

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

function add_global_style(css) {
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

function create_stylesheet() {
	add_global_style('#time_tracker { position: fixed; left: 0px; top: 0px; width: 100%; height: 100%; background-color: rgba(100,100,100,0.8); display: none; z-index: 10000; !important}');
	add_global_style('#time_tracker_expand { position: fixed; top: 0px; right: 0px; z-index: 10001 }');
	add_global_style('#centre_container { width: 600px; padding: 30px; margin: 0px auto; border: 0px solid #ccc; border-radius: 40px; background-color: rgba(70,70,70,1.0) }');
	add_global_style('#new_project_name {clear: left;}');
	add_global_style('#time_tracker_controls {clear: both;}');
	add_global_style("#time_tracker {font-family: Ubuntu,Arial,'libra sans',sans-serif");
	add_global_style('.hidden {display: none}');


	add_global_style('#time_tracker .projects_date {padding: 5px; background-color: #ccc; color: black;}');
	add_global_style('#time_tracker .projects_date_container {margin-bottom: 20px}');


	add_global_style('#time_tracker .project {color: #ddd; margin-top: 5px; font-size: 14px; line-height: 1.5em}');
	add_global_style('#time_tracker .project .name {width: 200px; display: block; float: left; color: #ddd}');
	add_global_style('#time_tracker .project .time {width: 50px; display: block; float: left; color: #ddd}');
	add_global_style('#time_tracker .project button {float: left; margin: 0px; width: 30px; height; 30px; padding: 0px}');


	add_global_style('.clearfix:after {content: "."; display: block; clear: both; visibility: hidden; line-height: 0; height: 0;');
	add_global_style('html[xmlns] .clearfix {display: block;}');
	add_global_style('* html .clearfix {height: 1%;}');
}

function set_value(key, value) {
    if(use_local_storage) {
        localStorage[key] = value;
    } else {
		GM_setValue(key,value);
    }
}

function get_value(key) {
    if(use_local_storage) {
        var value = localStorage[key]
    } else {
		var value = GM_getValue(key);
    }
	return value;
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
    
    console.log(values);
}


// ===============================================================================================
// TimeTracker class

function TimeTracker() {

	var project_list;
	var time_tracker_obj = this;

	// Load all the saved projects
	this.reload_projects();

	// Create HTML
	this.render_container();

}

// Return the next available key to store a project
TimeTracker.prototype.get_new_project_serial = function () {

	// We need to check whether other projects
	// have been added in another instance
	var num_projects = Number(get_value("num_projects"));

	return num_projects;
}

// Delete all the projects and clear the DOM
// TODO:  Replace with project.delete();
TimeTracker.prototype.clear_projects = function () {

    if(use_local_storage) {
		localStorage.clear();
    } else {
		var keys = GM_listValues();
		for (var i = 0; i < keys.length; i++) {
        	console.log("Deleting: " + keys[i]);
			GM_deleteValue(keys[i]);
		}
    }

}

// Initialises an empty date in this time_tracker
TimeTracker.prototype.init_date = function(date) {

	var displayed = 0;
	var today = new Date();
	if (date === format_date(today)) {
		displayed = 1;
	}

	this['dates'][date] = {
	   'displayed': displayed,
	   'projects': []
	}
}


/*
 * Adds a new project to the tracker with the given project name.
 */
TimeTracker.prototype.add_new_project = function (project_name) {

	console.log("Adding project: " + project_name);
	    
    // Create the new project object
	var id = this.get_new_project_serial();
	var time = 0;
	var date = new Date();
	date = date.getDate() + "_" + date.getMonth() + "_" + date.getFullYear();
	var project = new Project(id, project_name, time, date);
    
    // Update TimeTracker global state
    project.save();
    var num_projects = Number(get_value("num_projects"));
	num_projects += 1;
	set_value("num_projects", num_projects);
    
    // Need to rebuild the model here
    this.reload_projects();
}

/* 
 *  Rebuilds the model by retrieving all the projects from local storage
 */ 
TimeTracker.prototype.reload_projects = function () {

	// Clear this TimeTracker's
    // list of projects
	this.dates = {};
	this.projects = {};
    
    // Read the number of projects.  TODO: Replace as this is not normalised
	var num_projects = Number(get_value("num_projects"));
	if (num_projects == "undefined" || isNaN(num_projects)) {
		this.num_projects = 0;
		set_value("num_projects", 0);
	} else {
		this.num_projects = num_projects;
	}
    console.log("Number of projects to retrieve: " + num_projects);

	// Add the existing projects to the time tracker
	for (var i = 0; i < this.num_projects; i++) {
		var id = i;
		var name = get_value("project_name_" + i);
		var time = Number(get_value("project_time_" + i));
		var date = get_value("project_date_" + i);

		// Init this date if not seen before
		if (!this['dates'][date]) {
			this.init_date(date);
		}

		var project = new Project(id, name, time, date);
        console.log("Retrieving project: (" + id + ", " + name + ", " + date + ", " + time + ")");

		// Push project to both dates array and projects array.
		// Convenient for later
		this.dates[date].projects.push(project);
		this.projects[id] = project;
	}
}


// Check if the DB has been updated.
// TODO:  Currently always reloads.
TimeTracker.prototype.is_reload_required = function () {
	var reload;
	reload = 1;
	// Check the 'DB' to see if there is a new key.

	return reload;
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
TimeTracker.prototype.render = function() {
	
	$('#centre_container').remove();
	var tracker_html = this.get_tracker_html();
	$('#time_tracker').append(tracker_html);
	
}

// TODO: Convert to jQuery
// Generate all the DOM for the tracker
TimeTracker.prototype.get_tracker_html = function () {

	// Unbind event handlers

	console.log("Rendering");
	var html = '';
	html += '   <div id="centre_container">';
	html += '      <div id="projects">';

	// Render project_list
	html += this.get_project_list_html();

	html += '      </div>';
	html += '      <div id="time_tracker_controls">';
	html += '         <input id="new_project_name" value="" />';
	html += '         <button id="add_project">Add Project</button>';
	html += '         <button id="clear_projects">Clear All</button>';
	html += '      </div>';
	html += '   </div>';
	
	return html;

}

// Only called on startup.  Renders the main container
TimeTracker.prototype.render_container = function() {
	
	var html = '';
	html += '<button id="time_tracker_expand">+</button>';
	html += '<div id="time_tracker">'
	html += this.get_tracker_html();
	html += '</div>';

	$(document.body).append(html);

}

// TODO: Convert to jQuery
// Get an object to contain all projects for a particular date
// It'll only be expanded if it matches today's date
TimeTracker.prototype.get_project_list_html = function () {


	var html = '';
	// For each date, generate list of projects
	for (date in this.dates) {

		html += '<div class="projects_date_container">';
		html += '   <h3 class="projects_date">';
		html += '      <button class="expand_projects" data-date="' + date + '">+</button>';
		html += '      <span>' + date + '</span>';
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
	$(document).on('click', '.expand_projects', function () {
		var date = $(this).attr('data-date');
		time_tracker.handle_date_expand(date);
	});

    // Add a new project to the TimeTracker
	$(document).on('click', '#add_project', function () {
		var project_name = $("#new_project_name").val();
		time_tracker.handle_add_project(project_name);
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
	this.save();
}

Project.prototype.decrement_time = function () {
	this.time -= 0.25;
	this.save();
}

Project.prototype.save = function () {
	// Save project name
	var GM_project_name = 'project_name_' + this.id;
	set_value(GM_project_name, this.name);

	// Save project time
	var GM_project_time = 'project_time_' + this.id;
	set_value(GM_project_time, this.time);

	// Save project date
	var GM_project_date = 'project_date_' + this.id;
	set_value(GM_project_date, this.date);

	console.log("Saving project: " + this.id + "," + this.name + "," + this.date + "," + this.time);
}

Project.prototype.read = function () {
	var id = this.id;
	this.name = get_value("project_name_" + id);
	this.time = Number(get_value("project_time_" + id));
	this.date = get_value("project_date_" + id);

}

Project.prototype.delete = function () {}


// ======================== Project VIEW ====================================

// Create a DOM element for a project and return it.
Project.prototype.get_html = function () {


	var html = '';
	html += '<div class="project clearfix">';
	html += '<span class="name">' + this.name + '</span>';
	html += '<span class="time">' + this.time + '</span>';
	html += '<button class="add_time" data-project_id="' + this.id + '">+</button>';
	html += '<button class="subtract_time" data-project_id="' + this.id + '">-</button>';
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
	var project = this.projects[project_id];

	// Update the model
	project.increment_time();
	project.save();

    // Re-render the TimeTracker
	this.render();
}

/*
 *  Subtract a unit of time from Project with project_id
 */
TimeTracker.prototype.handle_decrement_time = function (project_id) {

	// Read the project
	var project = this.projects[project_id];

	// Update the model
	project.decrement_time();
	project.save();

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

	// Re-render everything
	this.render();
}

/*
 * 
 */
TimeTracker.prototype.handle_add_project = function (project_name) {

	// Retrieve the values and create new project in model
	this.add_new_project(project_name);

	// This is a convenient time to see if we have any other updates	
	if (this.is_reload_required()) {
        console.log("Reload required, projects added elsewhere");
		
	}
	this.render();
}

/*
 * 
 */
TimeTracker.prototype.handle_clear_projects = function() {

	this.clear_projects();

	// Reload model and re-render
	this.reload_projects();
	this.render();
}

// ================================= Main Program Body ==================================

$(document).ready(function () {

    use_local_storage = 0;
	create_stylesheet();
	document.time_tracker = new TimeTracker();

	// Register events
	document.time_tracker.register_event_handlers();

});

function test_time_tracker() {


	set_value('num_projects', 5);
	set_value('project_name_0', 'Project 1');
	set_value('project_time_0', 0);
	set_value('project_date_0', '16_10_2013');

	set_value('project_name_1', 'Project 2');
	set_value('project_time_1', 0);
	set_value('project_date_1', '16_10_2013');

	set_value('project_name_2', 'Project 3');
	set_value('project_time_2', 0);
	set_value('project_date_2', '17_10_2013');

	set_value('project_name_3', 'Project 4');
	set_value('project_time_3', 0);
	set_value('project_date_3', '18_10_2013');

	set_value('project_name_4', 'Project 5');
	set_value('project_time_4', 0);
	set_value('project_date_4', '20_10_2013');

}
