(window.webpackJsonp=window.webpackJsonp||[]).push([[20],{862:function(t,e,r){"use strict";r.r(e);r(5),r(3),r(2),r(1),r(4);var c=r(0),o=r(17);function l(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}var n={components:{THeader:THeader},computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?l(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):l(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(o.b)({order:"products/getOrder",cartTotal:"cart/cartTotalAmount",curr:"products/changeCurrency"})),methods:{getImgUrl:function(path){return r(228)("./"+path)}}},v=r(26),component=Object(v.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("THeader"),t._v(" "),""==t.order?r("section",{staticClass:"p-0"},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-sm-12"},[r("div",{staticClass:"error-section"},[r("h1",[t._v("404")]),t._v(" "),r("h2",[t._v("page not found")]),t._v(" "),r("nuxt-link",{class:"btn btn-solid",attrs:{to:{path:"/"}}},[t._v(" back to home")])],1)])])])]):t._e(),t._v(" "),""!=t.order?r("section",{staticClass:"section-b-space light-layout"},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-md-12"},[r("div",{staticClass:"success-text"},[r("i",{staticClass:"fa fa-check-circle",attrs:{"aria-hidden":"true"}}),t._v(" "),r("h2",[t._v("thank you")]),t._v(" "),r("p",[t._v("Payment is successfully processsed and your order is on the way")]),t._v(" "),r("p",[t._v("Transaction ID:"+t._s(t.order.token))])])])])])]):t._e(),t._v(" "),""!=t.order?r("section",{staticClass:"section-b-space"},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-lg-6"},[r("div",{staticClass:"product-order"},[r("h3",[t._v("your order details")]),t._v(" "),t._l(t.order.product,(function(e,c){return r("div",{key:c,staticClass:"row product-order-detail"},[r("div",{staticClass:"col-3"},[r("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:""}})]),t._v(" "),r("div",{staticClass:"col-3 order_detail"},[r("div",[r("h4",[t._v("product name")]),t._v(" "),r("h5",[t._v(t._s(e.title))])])]),t._v(" "),r("div",{staticClass:"col-3 order_detail"},[r("div",[r("h4",[t._v("quantity")]),t._v(" "),r("h5",[t._v(t._s(e.quantity))])])]),t._v(" "),r("div",{staticClass:"col-3 order_detail"},[r("div",[r("h4",[t._v("price")]),t._v(" "),r("h5",[t._v(t._s(t._f("currency")(e.price*t.curr.curr*e.quantity,t.curr.symbol)))])])])])})),t._v(" "),r("div",{staticClass:"total-sec"},[r("ul",[r("li",[t._v("\n                    Total\n                    "),r("span",[t._v(t._s(t._f("currency")(t.cartTotal*t.curr.curr,t.curr.symbol)))])])])])],2)]),t._v(" "),r("div",{staticClass:"col-lg-6"},[r("div",{staticClass:"row order-success-sec"},[r("div",{staticClass:"col-sm-6"},[r("h4",[t._v("summery")]),t._v(" "),r("ul",{staticClass:"order-detail"},[r("li",[t._v("order ID: "+t._s(t.order.token))]),t._v(" "),r("li",[t._v("Order Date: October 18, 2020")]),t._v(" "),r("li",[t._v("Order Total: "+t._s(t._f("currency")(t.cartTotal*t.curr.curr,t.curr.symbol)))])])]),t._v(" "),t._m(0),t._v(" "),t._m(1),t._v(" "),t._m(2)])])])])]):t._e()],1)}),[function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"col-sm-6"},[r("h4",[t._v("shipping address")]),t._v(" "),r("ul",{staticClass:"order-detail"},[r("li",[t._v("gerg harvell")]),t._v(" "),r("li",[t._v("568, suite ave.")]),t._v(" "),r("li",[t._v("Austrlia, 235153")]),t._v(" "),r("li",[t._v("Contact No. 987456321")])])])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"col-sm-12 payment-mode"},[e("h4",[this._v("payment method")]),this._v(" "),e("p",[this._v("Pay on Delivery (Cash/Card). Cash on delivery (COD) available. Card/Net banking acceptance subject to device availability.")])])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"col-md-12"},[e("div",{staticClass:"delivery-sec"},[e("h3",[this._v("expected date of delivery")]),this._v(" "),e("h2",[this._v("october 22, 2020")])])])}],!1,null,null,null);e.default=component.exports;installComponents(component,{THeader:r(150).default})}}]);