// js/helper_main.js

import { renderNavBar } from "./js_files/navBar/navBar.js";
import { renderHomeAgents } from "./js_files/about/home_agents.js";
import { renderPropertyCategory } from "./js_files/category/property_category.js";
import { renderPropertyList } from "./js_files/properties/property_list.js";
import { renderFooter } from "./js_files/footer/footer.js";
import { renderPropertyHeader } from "./js_files/properties/head_details.js";
import { renderPropertyDetails } from "./js_files/properties/render_property_details.js";
import { initPropertyListPage } from "./js_files/property_list/property_list_main/property_list_main.js";
import { initPropertyTypePage } from "./js_files/property_type/property_type.js";
import { initError404Page } from "./js_files/error_404/error_404.js";
import { initTestimonialPage } from "./js_files/testimonial/testimonial.js";

// added routes only
import { initPropertyAgentPage } from "./js_files/property_agent/property_agent.js";
import { initAboutPage } from "./js_files/about/about.js";
import { initContactPage } from "./js_files/contact/contact.js";

function isPropertyListPage() {
  return document.body?.dataset?.page === "property-list";
}

function isPropertyTypePage() {
  return document.body?.dataset?.page === "property-type";
}

function isError404Page() {
  return document.body?.dataset?.page === "error-404";
}

function isTestimonialPage() {
  return document.body?.dataset?.page === "testimonial";
}

// added helpers only
function isPropertyAgentPage() {
  return document.body?.dataset?.page === "property-agent";
}

function isAboutPage() {
  return document.body?.dataset?.page === "about";
}

function isContactPage() {
  return document.body?.dataset?.page === "contact";
}

export async function initAll(propertyId = null) {
  try {
    let tasks = [];

    if (isPropertyListPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initPropertyListPage()
      ];
    } else if (isPropertyTypePage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initPropertyTypePage()
      ];
    } else if (isError404Page()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initError404Page()
      ];
    } else if (isTestimonialPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initTestimonialPage()
      ];
    } else if (isPropertyAgentPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initPropertyAgentPage()
      ];
    } else if (isAboutPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initAboutPage()
      ];
    } else if (isContactPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initContactPage()
      ];
    } else {
      tasks = [
        renderNavBar(),
        renderPropertyCategory(),
        renderPropertyList(),
        renderHomeAgents(),
        renderFooter()
      ];
    }

    if (propertyId) {
      tasks.push(renderPropertyHeader(propertyId));
      tasks.push(renderPropertyDetails(propertyId));
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    console.error("❌ initAll() error:", err);
  }
}

export async function initPropertyModule(propertyId) {
  try {
    let tasks = [];

    if (isPropertyListPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initPropertyListPage()
      ];
    } else if (isPropertyTypePage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initPropertyTypePage()
      ];
    } else if (isError404Page()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initError404Page()
      ];
    } else if (isTestimonialPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initTestimonialPage()
      ];
    } else if (isPropertyAgentPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initPropertyAgentPage()
      ];
    } else if (isAboutPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initAboutPage()
      ];
    } else if (isContactPage()) {
      tasks = [
        renderNavBar(),
        renderFooter(),
        initContactPage()
      ];
    } else {
      tasks = [
        renderNavBar(),
        renderPropertyList(),
        renderPropertyCategory(),
        renderFooter()
      ];
    }

    if (propertyId) {
      tasks.push(renderPropertyHeader(propertyId));
      tasks.push(renderPropertyDetails(propertyId));
    }

    await Promise.allSettled(tasks);
  } catch (err) {
    console.error("❌ initPropertyModule() error:", err);
  }
}