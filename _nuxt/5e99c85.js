(window.webpackJsonp=window.webpackJsonp||[]).push([[17],{352:function(t,e,r){"use strict";r(5),r(3),r(2),r(1),r(4);var o=r(0),l=r(34);function n(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}var c={computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?n(Object(source),!0).forEach((function(e){Object(o.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):n(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(l.c)({locale:function(t){return t.i18n.locale}}))},d=r(52),component=Object(d.a)(c,(function(){var t=this,e=t.$createElement,o=t._self._c||e;return o("div",[o("footer",{staticClass:"footer-light pet-layout-footer"},[o("div",{staticClass:"white-layout"},[o("div",{staticClass:"container"},[o("section",{staticClass:"small-section"},[o("div",{staticClass:"row footer-theme2"},[o("div",{staticClass:"col"},[o("div",{staticClass:"footer-link link-white"},[o("div",{staticClass:"footer-brand-logo"},[o("nuxt-link",{attrs:{to:{path:"/"+this.locale}}},[o("img",{staticClass:"img-fluid",attrs:{src:r(354),alt:"logo"}})])],1),t._v(" "),t._m(0),t._v(" "),t._m(1),t._v(" "),o("div",{staticClass:"footer-contant"},[o("ul",[o("li",[o("nuxt-link",{attrs:{to:{path:"/"+this.locale+"/products"}}},[t._v("All products")])],1),t._v(" "),o("li",[o("nuxt-link",{attrs:{to:{path:"/"+this.locale+"/womans"}}},[t._v("womans")])],1),t._v(" "),o("li",[o("nuxt-link",{attrs:{to:{path:"/"+this.locale+"/kids"}}},[t._v("kids")])],1)])])])])])])])]),t._v(" "),t._m(2)])])}),[function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"social-white"},[e("ul",[e("li",[e("a",{attrs:{href:"https://www.facebook.com/www.donnel.hr/"}},[e("i",{staticClass:"fa fa-facebook",attrs:{"aria-hidden":"true"}})])]),this._v(" "),e("li",[e("a",{attrs:{href:"https://www.instagram.com/donnel.hr"}},[e("i",{staticClass:"fa fa-instagram",attrs:{"aria-hidden":"true"}})])])])])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"footer-title footer-mobile-title"},[e("h4",[this._v("my account")])])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"sub-footer white-subfooter"},[e("div",{staticClass:"container"},[e("div",{staticClass:"row"},[e("div",{staticClass:"col-12"},[e("div",{staticClass:"footer-end text-center"},[e("p",[e("i",{staticClass:"fa fa-copyright",attrs:{"aria-hidden":"true"}}),this._v(" Donnel 2021.\n              ")])])])])])])}],!1,null,null,null);e.a=component.exports},873:function(t,e,r){"use strict";r.r(e);var o=r(364),l=r(352),n={components:{THeader:THeader,Footer:l.a,ValidationProvider:o.b,ValidationObserver:o.a},data:function(){return{logintitle:"Login",registertitle:"New Customer",email:null,password:null}},methods:{onSubmit:function(){console.log("Form has been submitted!")}}},c=r(52),component=Object(c.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("THeader"),t._v(" "),r("section",{staticClass:"login-page section-b-space"},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-lg-6"},[r("h3",[t._v(t._s(t.logintitle))]),t._v(" "),r("div",{staticClass:"theme-card"},[r("ValidationObserver",{scopedSlots:t._u([{key:"default",fn:function(e){var o=e.invalid;return[r("form",{staticClass:"theme-form",on:{submit:function(e){return e.preventDefault(),t.onSubmit(e)}}},[r("div",{staticClass:"form-group"},[r("label",{attrs:{for:"email"}},[t._v("Email")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required|email",name:"email"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.email,expression:"email"}],staticClass:"form-control",attrs:{type:"email",id:"email",placeholder:"Email",name:"email"},domProps:{value:t.email},on:{input:function(e){e.target.composing||(t.email=e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("div",{staticClass:"form-group"},[r("label",{attrs:{for:"password"}},[t._v("Password")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required",name:"password"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.password,expression:"password"}],staticClass:"form-control",attrs:{type:"password",id:"password",placeholder:"Enter your password"},domProps:{value:t.password},on:{input:function(e){e.target.composing||(t.password=e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("button",{staticClass:"btn btn-solid",attrs:{type:"submit",disabled:o}},[t._v("Login")])])]}}])})],1)]),t._v(" "),r("div",{staticClass:"col-lg-6 right-login"},[r("h3",[t._v(t._s(t.registertitle))]),t._v(" "),r("div",{staticClass:"theme-card authentication-right"},[r("h6",{staticClass:"title-font"},[t._v("Create A Account")]),t._v(" "),r("p",[t._v("Sign up for a free account at our store. Registration is quick and easy. It allows you to be able to order from our shop. To start shopping click register.")]),t._v(" "),r("nuxt-link",{staticClass:"btn btn-solid",attrs:{to:{path:"/page/account/register"}}},[t._v("Create an Account")])],1)])])])]),t._v(" "),r("Footer")],1)}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{THeader:r(353).default})}}]);