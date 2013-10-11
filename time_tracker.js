// ==UserScript==
// @name       TimeTracker
// @namespace  http://use.i.E.your.homepage/
// @version    0.1
// @description  enter something useful
// @match      http://tampermonkey.net/index.php?version=3.5.3630.14&ext=dhdg&updated=true
// @copyright  2012+, You
// ==/UserScript==



function TimeTracker() {

    var project_list;
    
    this.reload_projects();

    // Create HTML
    this.create_dom_object();
    var time_tracker_obj = this;
    console.log("tracker loaded");
}

TimeTracker.prototype.get_new_project_serial = function() {
    
    // We need to check whether other projects
    // have been added in another instance
    var num_projects = GM_getValue("num_projects");
    
	return num_projects;
}


TimeTracker.prototype.clear_projects = function () {
    var keys = GM_listValues();
    for (var i = 0, key = null; key = keys[i]; i++) {
        GM_deleteValue(key);
    }
    
    this.project_list_obj.innerHTML="";
}


/*
 * Adds a new project to the tracker
 */
TimeTracker.prototype.add_new_project = function () {
    
    
    // TODO: We should check the 'DB' to see if
    // the state has changed.
    if(this.is_reload_required()) {
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
        var time = "0:05";
		var project = new Project(id, project_name, time);
		project.save();

    	// Update TimeTracker
    	this.num_projects += 1;
    	GM_setValue("num_projects", this.num_projects);

    	// Add project to the TimeTracker DOM object
    	this.add_project_DOM(project);
    }

}




// Reload this time tracker
TimeTracker.prototype.reload_projects = function() {
    
    // Clear the project list
   	this.project_list = [];

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
        var project = new Project(id, name, time);
        this.project_list.push(project);
    }
}


// Check if the DB has been updated
TimeTracker.prototype.is_reload_required = function() {
    var reload;
 	reload = 1;   
    // Check the 'DB' to see if there is a new key.
 
	return reload;
}


// Create a DOM element for a project and return it.
TimeTracker.prototype.add_project_DOM = function (project) {

    var project_obj = project.get_dom_object();

    // Add it to this TimeTracker project list DOM object
    this.project_list_obj.appendChild(project_obj);
}






// ================================== DOM Functions ===============================

// TODO: Tidy up with jQuery
// Generate all the DOM for the tracker
TimeTracker.prototype.create_dom_object = function () {

    var time_tracker_obj = this;
    var num_projects = this.num_projects;

    // Create the main container
    var overlay = document.createElement('div');
    overlay.id = "time_tracker";
    overlay.style.position = "absolute";
    overlay.style.right = '0px';
    overlay.style.top = '0px';
    overlay.style.zIndex = '10000';
    overlay.style.backgroundColor = '#444';
    overlay.style.padding = "10px";
    overlay.style.color = "#ddd";
    document.body.appendChild(overlay);


    // create project list container
    var project_list_obj = document.createElement('div');
    project_list_obj.id = "projects";
    overlay.appendChild(project_list_obj);
    this.project_list_obj = project_list_obj;


	this.reload_project_list_dom();


    // Create the controls
    var controls_obj = document.createElement('div');
    controls_obj.style.clear = "both";
    overlay.appendChild(controls_obj);
    
    var new_project_name = document.createElement('input');
    new_project_name.style.clear = "left";
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


TimeTracker.prototype.reload_project_list_dom = function() {
    // Create projects inside the project list
    this.project_list_obj.innerHTML = "";
    
    for (var i = 0; i < this.num_projects; i++) {
        var project = this.project_list[i];
        var project_obj = this.add_project_DOM(project);
    }    
}

//========================================================================================
// Project class


function Project(id, name, time) {
    this.id   = id;
    this.name = name;
	this.time = time;
    
    var dom_obj;
}

Project.prototype.set_time = function() {}

Project.prototype.get_time = function() {}

Project.prototype.set_name = function() {}

Project.prototype.get_name = function() {}

Project.prototype.increment_time = function() {}

Project.prototype.decrement_time = function() {}

Project.prototype.save = function() {
    // Save project name
    var GM_project_name = 'project_name_' + this.id;
    GM_setValue(GM_project_name, this.name);

    // Save project time
    var GM_project_time = 'project_time_' + this.id;
    GM_setValue(GM_project_time, this.time);
}

Project.prototype.read = function() {}

Project.prototype.delete = function() {}

// Create a DOM element for a project and return it.
Project.prototype.get_dom_object = function () {

    // Create container
    var project_obj = document.createElement('div');
    project_obj.style.clear = "left";

    // Create name display
    var new_project_name = document.createElement("span");
    new_project_name.innerHTML = this.name;
    new_project_name.style.width = "200px";
    new_project_name.style.display = "block";
    new_project_name.style.float = "left";
    project_obj.appendChild(new_project_name);

	// Create time display
    var new_project_time = document.createElement("span");
    new_project_time.style.width = "50px";
    new_project_time.style.display = "block";
    new_project_time.style.float = "left";
    new_project_time.innerHTML = this.time;
    project_obj.appendChild(new_project_time);

    // Create add time button
    var new_project_add_time = document.createElement("button");
    new_project_add_time.innerHTML = "+";
    new_project_add_time.style.float = "left";
    project_obj.appendChild(new_project_add_time);

    // Create subtract time button
    var new_project_subtract_time = document.createElement("button");
    new_project_subtract_time.innerHTML = "-";
    new_project_subtract_time.style.float = "left";
    project_obj.appendChild(new_project_subtract_time);

    this.dom_obj = project_obj;
    return project_obj;
}

document.time_tracker = new TimeTracker();