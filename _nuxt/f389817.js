(window.webpackJsonp=window.webpackJsonp||[]).push([[21],{872:function(e,t,r){"use strict";r.r(t);var header=r(351),o=r(352),l={components:{Header:header.a,Footer:o.a},data:function(){return{title1:"personal detail",title2:"shipping address",errors:[],fname:null,lname:null,email:null,phone:null,message:null}},methods:{checkForm1:function(e){if(this.errors=[],this.fname||this.errors.push("First name required."),this.lname||this.errors.push("Last name required."),this.email?this.validEmail(this.email)||this.errors.push("Valid email required."):this.errors.push("Email required."),this.phone||this.errors.push("Phone Number required."),this.message||this.errors.push("Message required."),!this.errors.length)return!0;e.preventDefault()},validEmail:function(e){return/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(e)}}},n=r(52),component=Object(n.a)(l,(function(){var e=this,t=e.$createElement,r=e._self._c||t;return r("div",[r("Header"),e._v(" "),r("section",{staticClass:"contact-page register-page"},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-sm-12"},[r("h3",[e._v(e._s(e.title1))]),e._v(" "),r("form",{staticClass:"theme-form",attrs:{method:"post"},on:{submit:e.checkForm1}},[e.errors.length?r("div",[r("ul",{staticClass:"validation-error mb-3"},e._l(e.errors,(function(t,o){return r("li",{key:o},[e._v(e._s(t))])})),0)]):e._e(),e._v(" "),r("div",{staticClass:"form-row"},[r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"fname"}},[e._v("First Name")]),e._v(" "),r("input",{directives:[{name:"model",rawName:"v-model",value:e.fname,expression:"fname"}],staticClass:"form-control",attrs:{type:"text",id:"fname",placeholder:"First Name",name:"fname",required:""},domProps:{value:e.fname},on:{input:function(t){t.target.composing||(e.fname=t.target.value)}}})]),e._v(" "),r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"lname"}},[e._v("Last Name")]),e._v(" "),r("input",{directives:[{name:"model",rawName:"v-model",value:e.lname,expression:"lname"}],staticClass:"form-control",attrs:{type:"text",id:"lname",placeholder:"Last Name",name:"lname",required:""},domProps:{value:e.lname},on:{input:function(t){t.target.composing||(e.lname=t.target.value)}}})]),e._v(" "),r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"phone"}},[e._v("Phone number")]),e._v(" "),r("input",{directives:[{name:"model",rawName:"v-model",value:e.phone,expression:"phone"}],staticClass:"form-control",attrs:{type:"tel",id:"phone",placeholder:"Enter your number",name:"phone",required:""},domProps:{value:e.phone},on:{input:function(t){t.target.composing||(e.phone=t.target.value)}}})]),e._v(" "),r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"email"}},[e._v("Email")]),e._v(" "),r("input",{directives:[{name:"model",rawName:"v-model",value:e.email,expression:"email"}],staticClass:"form-control",attrs:{type:"text",id:"email",placeholder:"Email",name:"email",required:""},domProps:{value:e.email},on:{input:function(t){t.target.composing||(e.email=t.target.value)}}})]),e._v(" "),r("div",{staticClass:"col-md-12"},[r("label",{attrs:{for:"message"}},[e._v("Write Your Message")]),e._v(" "),r("textarea",{directives:[{name:"model",rawName:"v-model",value:e.message,expression:"message"}],staticClass:"form-control",attrs:{placeholder:"Write Your Message",id:"message",name:"message",rows:"6"},domProps:{value:e.message},on:{input:function(t){t.target.composing||(e.message=t.target.value)}}})]),e._v(" "),e._m(0)])])])])])]),e._v(" "),r("section",{staticClass:"contact-page register-page section-b-space"},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-sm-12"},[r("h3",[e._v(e._s(e.title2))]),e._v(" "),r("form",{staticClass:"theme-form",attrs:{method:"post"},on:{submit:e.checkForm2}},[e._m(1)])])])])]),e._v(" "),r("Footer")],1)}),[function(){var e=this.$createElement,t=this._self._c||e;return t("div",{staticClass:"col-md-12"},[t("input",{staticClass:"btn btn-solid",attrs:{type:"submit",value:"Save"}})])},function(){var e=this,t=e.$createElement,r=e._self._c||t;return r("div",{staticClass:"form-row"},[r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"name"}},[e._v("flat / plot")]),e._v(" "),r("input",{staticClass:"form-control",attrs:{type:"text",id:"home-ploat",placeholder:"company name",required:""}})]),e._v(" "),r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"name"}},[e._v("Address *")]),e._v(" "),r("input",{staticClass:"form-control",attrs:{type:"text",id:"address-two",placeholder:"Address",required:""}})]),e._v(" "),r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"email"}},[e._v("Zip Code *")]),e._v(" "),r("input",{staticClass:"form-control",attrs:{type:"text",id:"zip-code",placeholder:"zip-code",required:""}})]),e._v(" "),r("div",{staticClass:"col-md-6 select_input"},[r("label",{attrs:{for:"review"}},[e._v("Country *")]),e._v(" "),r("select",{staticClass:"form-control",attrs:{size:"1"}},[r("option",{attrs:{value:"India"}},[e._v("India")]),e._v(" "),r("option",{attrs:{value:"UAE"}},[e._v("UAE")]),e._v(" "),r("option",{attrs:{value:"U.K"}},[e._v("U.K")]),e._v(" "),r("option",{attrs:{value:"US"}},[e._v("US")])])]),e._v(" "),r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"review"}},[e._v("City *")]),e._v(" "),r("input",{staticClass:"form-control",attrs:{type:"text",id:"city",placeholder:"City",required:""}})]),e._v(" "),r("div",{staticClass:"col-md-6"},[r("label",{attrs:{for:"review"}},[e._v("Region/State *")]),e._v(" "),r("input",{staticClass:"form-control",attrs:{type:"text",id:"region-state",placeholder:"Region/state",required:""}})]),e._v(" "),r("div",{staticClass:"col-md-12"},[r("button",{staticClass:"btn btn-sm btn-solid",attrs:{type:"submit"}},[e._v("Save setting")])])])}],!1,null,null,null);t.default=component.exports}}]);