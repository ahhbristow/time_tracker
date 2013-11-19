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
    GM_addStyle('#time_tracker { position: fixed; left: 0px; top: 0px; width: 100%; height: 100%; background-color: rgba(100,100,100,0.8); display: none; z-index: 10000; !important}');
    GM_addStyle('#time_tracker_expand { position: fixed; top: 0px; right: 0px; z-index: 10001 }');
    GM_addStyle('#centre_container { padding: 30px; margin: 200px; border: 0px solid #ccc; border-radius: 40px; background-color: rgba(70,70,70,1.0) }');
    GM_addStyle('#new_project_name {clear: left;}');
    GM_addStyle('#time_tracker_controls {clear: both;}');
    GM_addStyle("#time_tracker {font-family: Ubuntu,Arial,'libra sans',sans-serif");
    GM_addStyle('.hidden {display: none}');


    GM_addStyle('#time_tracker .projects_date {padding: 5px; background-color: #ccc; color: black;}');
    GM_addStyle('#time_tracker .projects_date_container {margin-bottom: 20px}');


    GM_addStyle('#time_tracker .project {color: #ddd; margin-top: 5px; font-size: 14px; line-height: 1.5em}');
    GM_addStyle('#time_tracker .project .name {width: 200px; display: block; float: left; color: #ddd}');
    GM_addStyle('#time_tracker .project .time {width: 50px; display: block; float: left; color: #ddd}');
    GM_addStyle('#time_tracker .project button {float: left; margin: 0px; width: 30px; height; 30px; padding: 0px}');


    GM_addStyle('.clearfix:after {content: "."; display: block; clear: both; visibility: hidden; line-height: 0; height: 0;');
    GM_addStyle('html[xmlns] .clearfix {display: block;}');
    GM_addStyle('* html .clearfix {height: 1%;}');
}

// ==============================

function TimeTracker() {

    var project_list;
    var time_tracker_obj = this;

    // Load all the saved projects
    this.reload_projects();

    // Create HTML
    this.create_dom_object();

}

// Return the next available key to store a project
TimeTracker.prototype.get_new_project_serial = function () {

    // We need to check whether other projects
    // have been added in another instance
    var num_projects = GM_getValue("num_projects");

    return num_projects;
}

// Delete all the projects and clear the DOM
TimeTracker.prototype.clear_projects = function () {
    var keys = GM_listValues();
    for (var i = 0, key = null; key = keys[i]; i++) {
        GM_deleteValue(key);
    }

    this.project_list_obj.innerHTML = "";
}


//Adds a new project to the tracker
// TODO: This has got some DOM code in it.  We should have
// a separate function for handling the DOM stuff.
TimeTracker.prototype.add_new_project = function () {


    // TODO: We should check the 'DB' to see if
    // the state has changed.
    if (this.is_reload_required()) {
        this.reload_projects();
        this.reload_project_list_dom();
    }

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
        date = date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();

        var project = new Project(id, project_name, time, date);
        project.save();

        // Update TimeTracker
        this.num_projects += 1;
        GM_setValue("num_projects", this.num_projects);

        // Add project to the TimeTracker DOM object
        this.add_project_DOM(project, date);
    }

}


// Reload this time tracker
TimeTracker.prototype.reload_projects = function () {

    // Clear the project list
    this.project_list = [];
    this.project_list['dates'] = {};

    // Read the number of existing projects
    var num_projects = GM_getValue("num_projects");
    if (num_projects == "undefined" || isNaN(num_projects)) {
        this.num_projects = 0;
        GM_setValue("num_projects", 0);
    } else {
        this.num_projects = num_projects;
    }
    console.log("Projects: " + this.num_projects);

    // Add the existing projects to the time tracker
    for (var i = 0; i < this.num_projects; i++) {
        var id = i;
        var name = GM_getValue("project_name_" + i);
        var time = GM_getValue("project_time_" + i);
        var date = GM_getValue("project_date_" + i);

        // Init this date if not seen before
        if (!this.project_list['dates'][date]) {
            this.project_list['dates'][date] = [];
        }

        var project = new Project(id, name, time, date);
        this.project_list['dates'][date].push(project);
    }
    console.log(this.project_list);
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

    var project_obj = project.get_dom_object();
    var projects_date_list = document.getElementById('projects_' + date);

    // Add it to this TimeTracker project list DOM object
    projects_date_list.appendChild(project_obj);
}




// TODO: Convert to jQuery
// Generate all the DOM for the tracker
TimeTracker.prototype.create_dom_object = function () {

    var time_tracker_obj = this;
    var num_projects = this.num_projects;

    // Create the main container modal window
    var overlay = document.createElement('div');
    overlay.id = "time_tracker";
    document.body.appendChild(overlay);

    var expand_button = document.createElement("button");
    expand_button.id = "time_tracker_expand";
    expand_button.innerHTML = "+";
    expand_button.onclick = function () {
        $(overlay).toggle();
    }
    document.body.appendChild(expand_button);

    // Create centre container
    var centre_container = document.createElement('div');
    centre_container.id = "centre_container";
    overlay.appendChild(centre_container);

    // create project list container
    var project_list_obj = document.createElement('div');
    project_list_obj.id = "projects";
    centre_container.appendChild(project_list_obj);
    this.project_list_obj = project_list_obj;


    this.reload_project_list_dom();


    // Create the controls
    var controls_obj = document.createElement('div');
    controls_obj.id = "time_tracker_controls";
    centre_container.appendChild(controls_obj);

    var new_project_name = document.createElement('input');
    new_project_name.value = "";
    new_project_name.id = "new_project_name";
    controls_obj.appendChild(new_project_name);

    var add_button = document.createElement("button");
    add_button.innerHTML = "Add Project";
    add_button.id = "add_project";
    add_button.onclick = function () {
        time_tracker_obj.add_new_project();
    }
    controls_obj.appendChild(add_button);

    var clear_button = document.createElement("button");
    clear_button.innerHTML = "Clear All";
    clear_button.id = "clear_projects";
    clear_button.onclick = function () {
        time_tracker_obj.clear_projects();
    }
    controls_obj.appendChild(clear_button);

    // Store reference to DOM obj as member var
    this.time_tracker_obj = overlay;
}




// TODO: Convert to jQuery
// Get an object to contain all projects for a particular date
// It'll only be expanded if it matches today's date
TimeTracker.prototype.add_projects_date_dom = function (date, project_list_obj) {

    var projects_date_div = document.createElement('div');
    projects_date_div.className = "projects_date_container";

    // Create heading
    var date_header = document.createElement('h3');
    date_header.className = 'projects_date';

    // Create date expand button
    var date_expand = document.createElement('button');
    date_expand.innerHTML = '+';
    date_expand.id = "expand_" + date;
    date_header.innerHTML += (date);

    // Add project list container
    var projects_date_list = document.createElement('div');
    projects_date_list.className = "projects";
    projects_date_list.id = 'projects_' + date;

    // If these projects aren't for today, hide by default
    var today = new Date();
    today = today.getDate() + "/" + today.getMonth() + "/" + today.getFullYear();
    console.log("Today: " + today + ", Date: " + date);
    if (date != today) {
        projects_date_list.className += " hidden";
    }

    // Set up expand button event handler
    date_expand.onclick = function () {
        //toggle(projects_date_list, 'block');
        $(projects_date_list).toggle();
    }


    // Add it all to the DOM
    project_list_obj.appendChild(projects_date_div);
    projects_date_div.appendChild(date_header);
    projects_date_div.appendChild(projects_date_list);
    date_header.appendChild(date_expand);

}

// TODO: Convert to jQuery
// Render the time tracker
TimeTracker.prototype.reload_project_list_dom = function () {
    // Create projects inside the project list
    this.project_list_obj.innerHTML = "";

    for (date in this.project_list['dates']) {

        // If this date hasn't been seen before, append new date div
        var projects_date_div = document.getElementById('projects_' + date);
        if (!projects_date_div) {
            projects_date_div = this.add_projects_date_dom(date, this.project_list_obj);
        }

        var project_list = this.project_list['dates'][date];
        for (var i = 0; i < project_list.length; i++) {
            var project = project_list[i];
            var project_obj = this.add_project_DOM(project, date);
        }
    }
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
    console.log("New time: " + this.time);
    this.save();
}

Project.prototype.decrement_time = function () {
    this.time -= 0.25;
    this.save();
}

Project.prototype.save = function () {
    // Save project name
    var GM_project_name = 'project_name_' + this.id;
    GM_setValue(GM_project_name, this.name);

    // Save project time
    var GM_project_time = 'project_time_' + this.id;
    GM_setValue(GM_project_time, this.time);

    // Save project date
    var GM_project_date = 'project_date_' + this.id;
    GM_setValue(GM_project_date, this.date);
}

Project.prototype.read = function () {}

Project.prototype.delete = function () {}


//============================================================================
// Controller functions

Project.prototype.handle_increment_time = function (time_obj) {

    // Update the model
    this.increment_time();

    // Update the DOM
    time_obj.innerHTML = this.get_time();
}

Project.prototype.handle_decrement_time = function (time_obj) {

    // Update the model
    this.decrement_time();

    // Update the DOM
    time_obj.innerHTML = this.get_time();
}

// Create a DOM element for a project and return it.
Project.prototype.get_dom_object = function () {

    var project = this;

    // Create container
    var project_obj = document.createElement('div');
    project_obj.className = "project clearfix";

    // Create name display
    var new_project_name = document.createElement("span");
    new_project_name.className = "name";
    new_project_name.innerHTML = this.date + ":   " + this.name;
    project_obj.appendChild(new_project_name);

    // Create time display
    var new_project_time = document.createElement("span");
    new_project_time.className = "time";
    new_project_time.innerHTML = this.time;
    project_obj.appendChild(new_project_time);

    // Create add time button
    var new_project_add_time = document.createElement("button");
    new_project_add_time.className = "add_time";
    new_project_add_time.innerHTML = "+";
    project_obj.appendChild(new_project_add_time);
    new_project_add_time.onclick = function () {
        project.handle_increment_time(new_project_time);
    }


    // Create subtract time button
    var new_project_subtract_time = document.createElement("button");
    new_project_subtract_time.innerHTML = "-";
    new_project_subtract_time.class = "subtract_time";
    project_obj.appendChild(new_project_subtract_time);
    new_project_subtract_time.onclick = function () {
        project.handle_decrement_time(new_project_time);
    }


    this.dom_obj = project_obj;
    return project_obj;
}


//test_time_tracker();
create_stylesheet();
document.time_tracker = new TimeTracker();




function test_time_tracker() {

    GM_setValue('num_projects', 5);
    GM_setValue('project_name_0', 'Project 1');
    GM_setValue('project_time_0', 0);
    GM_setValue('project_date_0', '16/10/2013');

    GM_setValue('project_name_1', 'Project 2');
    GM_setValue('project_time_1', 0);
    GM_setValue('project_date_1', '16/10/2013');

    GM_setValue('project_name_2', 'Project 3');
    GM_setValue('project_time_2', 0);
    GM_setValue('project_date_2', '17/10/2013');

    GM_setValue('project_name_3', 'Project 4');
    GM_setValue('project_time_3', 0);
    GM_setValue('project_date_3', '18/10/2013');

    GM_setValue('project_name_4', 'Project 5');
    GM_setValue('project_time_4', 0);
    GM_setValue('project_date_4', '19/10/2013');

}
