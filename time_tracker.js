// ==UserScript==
// @name       TimeTracker
// @namespace  http://use.i.E.your.homepage/
// @version    1.0
// @description  enter something useful
// @match      http://tampermonkey.net/index.php?version=3.5.3630.14&ext=dhdg&updated=true
// @copyright  2012+, You
// @include  http://*/*
// @require http://code.jquery.com/jquery-1.10.2.min.js
// ==/UserScript==



function toggle(dom_element, display) {
    console.log("Toggling: Old display: " + dom_element.style.display + ", New display: " + display);
    if (dom_element.style.display != display) {
        dom_element.style.display = display;
    } else {
        dom_element.style.display = "none";
    }
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
    add_global_style('#time_tracker { position: fixed; left: 0px; top: 0px; width: 100%; height: 100%; background-color: rgba(100,100,100,0.8); display: block; z-index: 10000; !important}');
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
	localStorage[key] = value;
}

function get_value(key) {
	var value = localStorage[key];
	return value;
}


// ==============================

function TimeTracker() {

    var project_list;
    var time_tracker_obj = this;

    // Load all the saved projects
    this.reload_projects();

    // Create HTML
    this.render();

}

// Return the next available key to store a project
TimeTracker.prototype.get_new_project_serial = function () {

    // We need to check whether other projects
    // have been added in another instance
    var num_projects = Number(get_value("num_projects"));

    return num_projects;
}

// Delete all the projects and clear the DOM
TimeTracker.prototype.clear_projects = function () {
	for (var key in localStorage) {
		console.log("Removing key: " + key); 
		localStorage.removeItem(key);
    	}

	// Re-render
        this.reload_projects();
	this.reload_project_list_dom();
}


//Adds a new project to the tracker
// TODO: This has got some DOM code in it.  We should have
// a separate function for handling the DOM stuff.
TimeTracker.prototype.add_new_project = function () {



    // Retrieve values from the DOM
    var project_name_obj = document.getElementById("new_project_name");
    var project_name = project_name_obj.value
    // Clear new project DOM object
    project_name_obj.value = "";


    // If name was supplied, create a project, save it and add to DOM
    if (project_name != "") {

        // Create new project object
        var id = this.get_new_project_serial();
        var time = 0;

        var date = new Date();
        date = date.getDate() + "_" + date.getMonth() + "_" + date.getFullYear();

        var project = new Project(id, project_name, time, date);
        project.save();

        // Update TimeTracker
        this.num_projects += 1;
        set_value("num_projects", this.num_projects);
    }

    // Re-load the model fully.
    // TODO:  Optimise this as it's inefficient to clear
    // and reload the model.
    if (this.is_reload_required()) {
        this.reload_projects();
    	
	// Re-render
	this.reload_project_list_dom();
    }
}


// Reload this time tracker
TimeTracker.prototype.reload_projects = function () {

	// Clear the project list
	this.dates = {};
	this.projects = {};

	// Read the number of existing projects
	var num_projects = Number(get_value("num_projects"));
	if (num_projects == "undefined" || isNaN(num_projects)) {
		this.num_projects = 0;
		set_value("num_projects", 0);
	} else {
		this.num_projects = num_projects;
	}

	// Add the existing projects to the time tracker
	for (var i = 0; i < this.num_projects; i++) {

		var id = i;
		var name = get_value("project_name_" + i);
		var time = Number(get_value("project_time_" + i));
		var date = get_value("project_date_" + i);

		// Init this date if not seen before
		if (!this['dates'][date]) {
			this['dates'][date] = {
			  'displayed' : '0',
			  'projects'  : []
			}
		}

		var project = new Project(id, name, time, date);

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



// TODO: Convert to jQuery
// Create a DOM element for a project and add to the time tracker.
TimeTracker.prototype.add_project_DOM = function (project, date) {

    var project_html = project.get_dom_object();

    // Add it to this TimeTracker project list DOM object
    var id = '#projects_' + date;
    $(id).append(project_html);
}




// TODO: Convert to jQuery
// Generate all the DOM for the tracker
TimeTracker.prototype.render = function () {

	// Unbind event handlers
	$('#time_tracker').remove();
	$('#time_tracker_expand').remove();

	console.log("Rendering");
	var html = '';
	html += '<button id="time_tracker_expand">+</button>';
	html += '<div id="time_tracker">';
	html += '   <div id="centre_container">';
	html += '      <div id="projects">';

	// Render project_list
	html += this.get_project_list_html();
	
	html += '      </div>';
	html += '      <div id="time_tracker_controls>';
	html += '         <input />';
	html += '         <button id="add_project">Add Project</button>';
	html += '         <button id="clear_projects">Clear All</button>';
	html += '      </div>';
	html += '   </div>';
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


TimeTracker.prototype.register_event_handlers = function() {

	// Register handlers for adding time
	var time_tracker = this;
	$(document).on('click', '.add_time', function() {
		var project_id = $(this).attr('data-project_id');
		console.log("Add Time to project: " + project_id);
		time_tracker.handle_increment_time(project_id);
		 
	});
	// Register handlers for adding time
	var time_tracker = this;
	$(document).on('click', '.subtract_time', function() {
		var project_id = $(this).attr('data-project_id');
		console.log("Subtract Time from project: " + project_id);
		time_tracker.handle_decrement_time(project_id);
	});
	
	
	$(document).on('click', '.expand_projects', function() {
		var date = $(this).attr('data-date');
		time_tracker.handle_date_expand(date);
	});
		 


}
TimeTracker.prototype.deregister_event_handlers = function() {

	var time_tracker = this;
	$(document).off('click', '.add_time', function() {
		// Do nothing
		// Clears any existing event handlers
	});
}


//========================================================================================
// Project class


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
}

Project.prototype.read = function () {
	var id = this.id;
	this.name = get_value("project_name_" + id);
	this.time = Number(get_value("project_time_" + id));
	this.date = get_value("project_date_" + id);

}

Project.prototype.delete = function () {}


//============================================================================
// Controller functions

TimeTracker.prototype.handle_increment_time = function (project_id) {

	console.log("handle_increment_time: " + project_id);

	// Read the project
	var project = this.projects[project_id];

	// Update the model
	project.increment_time();
	project.save();

	this.render();
}

TimeTracker.prototype.handle_decrement_time = function (project_id) {

	// Read the project
	var project = this.projects[project_id];

	// Update the model
	project.decrement_time();
	project.save();
	
	this.render();
}

// Just expand the project list for this date
TimeTracker.prototype.handle_date_expand = function(date) {
	console.log("Expanding: " + date);


	// TODO:  Update model here to set displayed = 1
	var tracker_date = this.dates[date];
	if(tracker_date.displayed == 1) {
		tracker_date.displayed = 0;
	} else {
		tracker_date.displayed = 1;
	}
	
	// Should re-render
	this.render();
	//$('#projects_' + date).toggle();
}


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


$( document ).ready(function() {
	test_time_tracker();
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
