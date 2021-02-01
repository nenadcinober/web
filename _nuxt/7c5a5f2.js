(window.webpackJsonp=window.webpackJsonp||[]).push([[8],{852:function(t,e,r){"use strict";r.r(e);r(5),r(3),r(2),r(4),r(18),r(19),r(1),r(8);var o=r(0),l=r(832),n=r(17);function c(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}var d={components:{ValidationProvider:l.b,ValidationObserver:l.a},computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?c(Object(source),!0).forEach((function(e){Object(o.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):c(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(n.b)({cart:"cart/cartItems",cartTotal:"cart/cartTotalAmount",curr:"products/changeCurrency"})),data:function(){return{user:{firstName:"",lastName:"",phone:"",email:"",address:"",city:"",state:"",pincode:""},isLogin:!1,paypal:{sandbox:"sb-brd7q4807544"},payment:!1,environment:"sandbox",button_style:{label:"checkout",size:"medium",shape:"pill",color:"blue"},amtchar:""}},methods:{order:function(){this.isLogin=localStorage.getItem("userlogin"),this.isLogin||this.$router.replace("/page/account/login-firebase")},getamt:function(){return this.cartTotal.toString()},onPaymentComplete:function(data){this.$store.dispatch("products/createOrder",{product:this.cart,userDetail:this.user,token:data.orderID,amt:this.cartTotal}),this.$router.push("/page/order-success")},onCancelled:function(){console.log("You cancelled a window")},onSubmit:function(){console.log("Form has been submitted!")}}},v=r(26),component=Object(v.a)(d,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("THeader"),t._v(" "),r("section",{staticClass:"section-b-space",staticStyle:{"padding-top":"120px"}},[r("div",{staticClass:"container"},[r("div",{staticClass:"checkout-page"},[r("div",{staticClass:"checkout-form"},[r("ValidationObserver",{scopedSlots:t._u([{key:"default",fn:function(e){e.invalid;return[r("form",{on:{submit:function(e){return e.preventDefault(),t.onSubmit(e)}}},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-lg-6 col-sm-12 col-xs-12"},[r("div",{staticClass:"checkout-title"},[r("h3",[t._v("Billing Details")])]),t._v(" "),r("div",{staticClass:"row check-out"},[r("div",{staticClass:"form-group col-md-6 col-sm-6 col-xs-12"},[r("div",{staticClass:"field-label"},[t._v("First Name")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required",name:"First name"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.user.firstName,expression:"user.firstName"}],attrs:{type:"text",name:"First name"},domProps:{value:t.user.firstName},on:{input:function(e){e.target.composing||t.$set(t.user,"firstName",e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("div",{staticClass:"form-group col-md-6 col-sm-6 col-xs-12"},[r("div",{staticClass:"field-label"},[t._v("Last Name")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required",name:"Last name"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.user.lastName,expression:"user.lastName"}],attrs:{type:"text",name:"Last name"},domProps:{value:t.user.lastName},on:{input:function(e){e.target.composing||t.$set(t.user,"lastName",e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("div",{staticClass:"form-group col-md-6 col-sm-6 col-xs-12"},[r("ValidationProvider",{attrs:{rules:"required|digits:10",name:"phone Number"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("div",{staticClass:"field-label"},[t._v("Phone")]),t._v(" "),r("input",{directives:[{name:"model",rawName:"v-model",value:t.user.phone,expression:"user.phone"}],attrs:{type:"text",name:"Phone"},domProps:{value:t.user.phone},on:{input:function(e){e.target.composing||t.$set(t.user,"phone",e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("div",{staticClass:"form-group col-md-6 col-sm-6 col-xs-12"},[r("div",{staticClass:"field-label"},[t._v("Email Address")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required|email",name:"Email"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.user.email,expression:"user.email"}],attrs:{type:"text",name:"Email Address"},domProps:{value:t.user.email},on:{input:function(e){e.target.composing||t.$set(t.user,"email",e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("div",{staticClass:"form-group col-md-12 col-sm-12 col-xs-12"},[r("div",{staticClass:"field-label"},[t._v("Country")]),t._v(" "),r("select",[r("option",[t._v("India")]),t._v(" "),r("option",{attrs:{selected:""}},[t._v("South Africa")]),t._v(" "),r("option",[t._v("United State")]),t._v(" "),r("option",[t._v("Australia")])])]),t._v(" "),r("div",{staticClass:"form-group col-md-12 col-sm-12 col-xs-12"},[r("div",{staticClass:"field-label"},[t._v("Address")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required",name:"Address"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.user.address,expression:"user.address"}],attrs:{type:"text",name:"Address"},domProps:{value:t.user.address},on:{input:function(e){e.target.composing||t.$set(t.user,"address",e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("div",{staticClass:"form-group col-md-12 col-sm-12 col-xs-12"},[r("div",{staticClass:"field-label"},[t._v("Town/City")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required",name:"City"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.user.city,expression:"user.city"}],attrs:{type:"text",name:"City"},domProps:{value:t.user.city},on:{input:function(e){e.target.composing||t.$set(t.user,"city",e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("div",{staticClass:"form-group col-md-12 col-sm-6 col-xs-12"},[r("div",{staticClass:"field-label"},[t._v("State / County")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required",name:"State"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.user.state,expression:"user.state"}],attrs:{type:"text",name:"State"},domProps:{value:t.user.state},on:{input:function(e){e.target.composing||t.$set(t.user,"state",e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1),t._v(" "),r("div",{staticClass:"form-group col-md-12 col-sm-6 col-xs-12"},[r("div",{staticClass:"field-label"},[t._v("Postal Code")]),t._v(" "),r("ValidationProvider",{attrs:{rules:"required",name:"Postal Code"},scopedSlots:t._u([{key:"default",fn:function(e){var o=e.errors;return[r("input",{directives:[{name:"model",rawName:"v-model",value:t.user.pincode,expression:"user.pincode"}],attrs:{type:"text",name:"Postal Code"},domProps:{value:t.user.pincode},on:{input:function(e){e.target.composing||t.$set(t.user,"pincode",e.target.value)}}}),t._v(" "),r("span",{staticClass:"validate-error"},[t._v(t._s(o[0]))])]}}],null,!0)})],1)])]),t._v(" "),r("div",{staticClass:"col-lg-6 col-sm-12 col-xs-12"},[r("div",{staticClass:"checkout-details"},[r("div",{staticClass:"order-box"},[r("div",{staticClass:"title-box"},[r("div",[t._v("\n                        Product\n                        "),r("span",[t._v("Total")])])]),t._v(" "),t.cart.length?r("ul",{staticClass:"qty"},t._l(t.cart,(function(e,o){return r("li",{key:o},[t._v("\n                        "+t._s(t._f("uppercase")(e.title))+" X "+t._s(e.quantity)+"\n                        "),r("span",[t._v(t._s(t._f("currency")(e.price*t.curr.curr*e.quantity,t.curr.symbol)))])])})),0):t._e(),t._v(" "),r("ul",{staticClass:"sub-total"},[r("li",[t._v("\n                        Subtotal\n                        "),r("span",{staticClass:"count"},[t._v(t._s(t._f("currency")(t.cartTotal*t.curr.curr,t.curr.symbol)))])]),t._v(" "),r("li",[t._v("Shipping\n                                          "),r("div",{staticClass:"shipping"},[r("span",[t._v(t._s(t._f("currency")(0,t.curr.symbol)))])])])]),t._v(" "),r("ul",{staticClass:"sub-total"},[r("li",[t._v("\n                        Total\n                        "),r("span",{staticClass:"count"},[t._v(t._s(t._f("currency")(t.cartTotal*t.curr.curr,t.curr.symbol)))])])])]),t._v(" "),r("div",{staticClass:"payment-box",attrs:{id:"paypal-button-container"}},[r("div",{staticClass:"text-right"},[r("no-ssr")],1)])])])])])]}}])})],1)])])])],1)}),[],!1,null,null,null);e.default=component.exports;installComponents(component,{THeader:r(148).default})}}]);