(window.webpackJsonp=window.webpackJsonp||[]).push([[103],{1035:function(t,e,r){"use strict";r.r(e);r(6),r(4),r(3),r(2),r(5);var o=r(0),c=r(30),l=r(368),n=r(367),d=r(380),v=r(381),f=r(384),m=r(388),h=r(613),_=r(614),C=r(998);function w(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}var y={components:{Header:l.a,Slider:h.default,CollectionBanner:_.default,ProductTab:C.default,Footer:n.a,quickviewModel:d.a,compareModel:v.a,cartModel:f.a,newsletterModel:m.a},data:function(){return{products:[],category:[],showquickviewmodel:!1,showcomparemodal:!1,showcartmodal:!1,quickviewproduct:{},comapreproduct:{},cartproduct:{}}},computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?w(Object(source),!0).forEach((function(e){Object(o.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):w(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(c.c)({productslist:function(t){return t.products.productslist}})),mounted:function(){this.productsArray()},methods:{productsArray:function(){var t=this;this.productslist.map((function(e){"electronics"===e.type&&(t.products.push(e),e.collection.map((function(i){-1===t.category.indexOf(i)&&t.category.push(i)})))}))},showQuickview:function(t,e){this.showquickviewmodel=t,this.quickviewproduct=e},showCoampre:function(t,e){this.showcomparemodal=t,this.comapreproduct=e},closeCompareModal:function(t){this.showcomparemodal=t},showCart:function(t,e){this.showcartmodal=t,this.cartproduct=e},closeCartModal:function(t){this.showcartmodal=t}}},O=r(35),component=Object(O.a)(y,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"container-fluid layout-8"},[r("Header"),t._v(" "),r("Slider"),t._v(" "),r("div",{staticClass:"layout-8-bg"},[r("CollectionBanner"),t._v(" "),r("ProductTab",{attrs:{products:t.products,category:t.category},on:{openQuickview:t.showQuickview,openCompare:t.showCoampre,openCart:t.showCart}})],1),t._v(" "),r("Footer"),t._v(" "),r("quickviewModel",{attrs:{openModal:t.showquickviewmodel,productData:t.quickviewproduct}}),t._v(" "),r("compareModel",{attrs:{openCompare:t.showcomparemodal,productData:t.comapreproduct},on:{closeCompare:t.closeCompareModal}}),t._v(" "),r("cartModel",{attrs:{openCart:t.showcartmodal,productData:t.cartproduct,products:t.products},on:{closeCart:t.closeCartModal}}),t._v(" "),r("newsletterModel")],1)}),[],!1,null,null,null);e.default=component.exports},367:function(t,e,r){"use strict";var o={},c=r(35),component=Object(c.a)(o,(function(){var t=this,e=t.$createElement,o=t._self._c||e;return o("div",[o("footer",{staticClass:"footer-light"},[t._m(0),t._v(" "),o("section",{staticClass:"section-b-space light-layout"},[o("div",{staticClass:"container"},[o("div",{staticClass:"row footer-theme partition-f"},[o("div",{staticClass:"col-lg-4 col-md-6"},[t._m(1),t._v(" "),o("div",{staticClass:"footer-contant"},[o("div",{staticClass:"footer-logo"},[o("img",{attrs:{src:r(369),alt:"logo"}})]),t._v(" "),o("p",[t._v("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,")]),t._v(" "),t._m(2)])]),t._v(" "),t._m(3),t._v(" "),t._m(4),t._v(" "),t._m(5)])])]),t._v(" "),o("div",{staticClass:"sub-footer"},[o("div",{staticClass:"container"},[o("div",{staticClass:"row"},[t._m(6),t._v(" "),o("div",{staticClass:"col-xl-6 col-md-6 col-sm-12"},[o("div",{staticClass:"payment-card-bottom"},[o("ul",[o("li",[o("a",{attrs:{href:"#"}},[o("img",{attrs:{src:r(375),alt:""}})])]),t._v(" "),o("li",[o("a",{attrs:{href:"#"}},[o("img",{attrs:{src:r(373),alt:""}})])]),t._v(" "),o("li",[o("a",{attrs:{href:"#"}},[o("img",{attrs:{src:r(374),alt:""}})])]),t._v(" "),o("li",[o("a",{attrs:{href:"#"}},[o("img",{attrs:{src:r(371),alt:""}})])]),t._v(" "),o("li",[o("a",{attrs:{href:"#"}},[o("img",{attrs:{src:r(372),alt:""}})])])])])])])])])])])}),[function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"light-layout"},[e("div",{staticClass:"container"},[e("section",{staticClass:"small-section border-section border-top-0"},[e("div",{staticClass:"row"},[e("div",{staticClass:"col-lg-6"},[e("div",{staticClass:"subscribe"},[e("div",[e("h4",[this._v("KNOW IT ALL FIRST!")]),this._v(" "),e("p",[this._v("Never Miss Anything From Multikart By Signing Up To Our Newsletter.")])])])]),this._v(" "),e("div",{staticClass:"col-lg-6"},[e("form",{staticClass:"form-inline subscribe-form auth-form needs-validation",attrs:{method:"post",id:"mc-embedded-subscribe-form",name:"mc-embedded-subscribe-form",target:"_blank"}},[e("div",{staticClass:"form-group mx-sm-3"},[e("input",{staticClass:"form-control",attrs:{type:"text",name:"EMAIL",id:"mce-EMAIL",placeholder:"Enter your email",required:"required"}})]),this._v(" "),e("button",{staticClass:"btn btn-solid",attrs:{type:"submit",id:"mc-submit"}},[this._v("subscribe")])])])])])])])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"footer-title footer-mobile-title"},[e("h4",[this._v("about")])])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"footer-social"},[e("ul",[e("li",[e("a",{attrs:{href:"#"}},[e("i",{staticClass:"fa fa-facebook",attrs:{"aria-hidden":"true"}})])]),this._v(" "),e("li",[e("a",{attrs:{href:"#"}},[e("i",{staticClass:"fa fa-google-plus",attrs:{"aria-hidden":"true"}})])]),this._v(" "),e("li",[e("a",{attrs:{href:"#"}},[e("i",{staticClass:"fa fa-twitter",attrs:{"aria-hidden":"true"}})])]),this._v(" "),e("li",[e("a",{attrs:{href:"#"}},[e("i",{staticClass:"fa fa-instagram",attrs:{"aria-hidden":"true"}})])]),this._v(" "),e("li",[e("a",{attrs:{href:"#"}},[e("i",{staticClass:"fa fa-rss",attrs:{"aria-hidden":"true"}})])])])])},function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"col offset-xl-1"},[r("div",{staticClass:"sub-title"},[r("div",{staticClass:"footer-title"},[r("h4",[t._v("my account")])]),t._v(" "),r("div",{staticClass:"footer-contant"},[r("ul",[r("li",[r("a",{attrs:{href:"#"}},[t._v("mens")])]),t._v(" "),r("li",[r("a",{attrs:{href:"#"}},[t._v("womens")])]),t._v(" "),r("li",[r("a",{attrs:{href:"#"}},[t._v("clothing")])]),t._v(" "),r("li",[r("a",{attrs:{href:"#"}},[t._v("accessories")])]),t._v(" "),r("li",[r("a",{attrs:{href:"#"}},[t._v("featured")])])])])])])},function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"col"},[r("div",{staticClass:"sub-title"},[r("div",{staticClass:"footer-title"},[r("h4",[t._v("why we choose")])]),t._v(" "),r("div",{staticClass:"footer-contant"},[r("ul",[r("li",[r("a",{attrs:{href:"#"}},[t._v("shipping & return")])]),t._v(" "),r("li",[r("a",{attrs:{href:"#"}},[t._v("secure shopping")])]),t._v(" "),r("li",[r("a",{attrs:{href:"#"}},[t._v("gallary")])]),t._v(" "),r("li",[r("a",{attrs:{href:"#"}},[t._v("affiliates")])]),t._v(" "),r("li",[r("a",{attrs:{href:"#"}},[t._v("contacts")])])])])])])},function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"col"},[r("div",{staticClass:"sub-title"},[r("div",{staticClass:"footer-title"},[r("h4",[t._v("store information")])]),t._v(" "),r("div",{staticClass:"footer-contant"},[r("ul",{staticClass:"contact-list"},[r("li",[r("i",{staticClass:"fa fa-map-marker"}),t._v("Multikart Demo Store, Demo store India 345-659\n                  ")]),t._v(" "),r("li",[r("i",{staticClass:"fa fa-phone"}),t._v("Call Us: 123-456-7898\n                  ")]),t._v(" "),r("li",[r("i",{staticClass:"fa fa-envelope-o"}),t._v("Email Us:\n                    "),r("a",{attrs:{href:"#"}},[t._v("Support@Fiot.com")])]),t._v(" "),r("li",[r("i",{staticClass:"fa fa-fax"}),t._v("Fax: 123456\n                  ")])])])])])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"col-xl-6 col-md-6 col-sm-12"},[e("div",{staticClass:"footer-end"},[e("p",[e("i",{staticClass:"fa fa-copyright",attrs:{"aria-hidden":"true"}}),this._v(" 2017-18 themeforest powered by pixelstrap\n              ")])])])}],!1,null,null,null);e.a=component.exports},368:function(t,e,r){"use strict";var o=r(377),c=r(379),l=r(376),n=r(378),d={data:function(){return{leftSidebarVal:!1}},components:{TopBar:o.a,LeftSidebar:c.a,Nav:l.a,HeaderWidgets:n.a},methods:{left_sidebar:function(){this.leftSidebarVal=!0},closeBarValFromChild:function(t){this.leftSidebarVal=t}}},v=r(35),component=Object(v.a)(d,(function(){var t=this,e=t.$createElement,o=t._self._c||e;return o("div",[o("header",[o("div",{staticClass:"mobile-fix-option"}),t._v(" "),o("TopBar"),t._v(" "),o("div",{staticClass:"container"},[o("div",{staticClass:"row"},[o("div",{staticClass:"col-sm-12"},[o("div",{staticClass:"main-menu"},[o("div",{staticClass:"menu-left"},[o("div",{staticClass:"navbar"},[o("a",{on:{click:t.left_sidebar}},[t._m(0)]),t._v(" "),o("LeftSidebar",{attrs:{leftSidebarVal:t.leftSidebarVal},on:{closeVal:t.closeBarValFromChild}})],1),t._v(" "),o("div",{staticClass:"brand-logo"},[o("nuxt-link",{attrs:{to:{path:"/shop/fashion"}}},[o("img",{staticClass:"img-fluid",attrs:{src:r(369),alt:""}})])],1)]),t._v(" "),o("div",{staticClass:"menu-right pull-right"},[o("Nav"),t._v(" "),o("HeaderWidgets")],1)])])])])],1)])}),[function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"bar-style"},[e("i",{staticClass:"fa fa-bars sidebar-bar",attrs:{"aria-hidden":"true"}})])}],!1,null,null,null);e.a=component.exports},380:function(t,e,r){"use strict";r(6),r(4),r(3),r(2),r(5);var o=r(0),c=r(30);function l(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}var n={props:["openModal","productData"],data:function(){return{swiperOption:{slidesPerView:1,spaceBetween:20,freeMode:!0}}},computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?l(Object(source),!0).forEach((function(e){Object(o.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):l(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(c.b)({curr:"products/changeCurrency"})),methods:{Color:function(t){for(var e=[],i=0;i<Object.keys(t).length;i++)-1===e.indexOf(t[i].color)&&e.push(t[i].color);return e},Size:function(t){for(var e=[],i=0;i<Object.keys(t).length;i++)-1===e.indexOf(t[i].size)&&e.push(t[i].size);return e},addToCart:function(t){this.$store.dispatch("cart/addToCart",t)},getImgUrl:function(path){return r(366)("./"+path)},discountedPrice:function(t){return t.price-t.price*t.discount/100}}},d=r(35),component=Object(d.a)(n,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[t.openModal?r("b-modal",{attrs:{id:"modal-lg",size:"lg",centered:"",title:"Quickview","hide-footer":!0}},[r("div",{staticClass:"row quickview-modal"},[r("div",{staticClass:"col-lg-6 col-xs-12"},[r("div",{staticClass:"quick-view-img"},[r("div",{directives:[{name:"swiper",rawName:"v-swiper:mySwiper",value:t.swiperOption,expression:"swiperOption",arg:"mySwiper"}]},[r("div",{staticClass:"swiper-wrapper"},t._l(t.productData.images,(function(e,o){return r("div",{key:o,staticClass:"swiper-slide"},[r("img",{staticClass:"img-fluid bg-img",attrs:{src:t.getImgUrl(e.src),id:e.image_id,alt:"imag.alt"}})])})),0)])])]),t._v(" "),r("div",{staticClass:"col-lg-6 rtl-text"},[r("div",{staticClass:"product-right"},[r("h2",[t._v(t._s(t.productData.title))]),t._v(" "),t.productData.sale?r("h3",[t._v("\n            "+t._s(t._f("currency")(t.discountedPrice(t.productData)*t.curr.curr,t.curr.symbol))+"\n      "),r("del",[t._v(t._s(t._f("currency")(t.productData.price*t.curr.curr,t.curr.symbol)))])]):r("h3",[t._v(t._s(t._f("currency")(t.productData.price*t.curr.curr,t.curr.symbol)))]),t._v(" "),t.productData.variants[0].color?r("ul",{staticClass:"color-variant"},t._l(t.Color(t.productData.variants),(function(t,e){return r("li",{key:e},[r("a",{class:[t],style:{"background-color":t}})])})),0):t._e(),t._v(" "),t.productData.variants[0].size?r("div",{staticClass:"product-description border-product"},[r("h6",{staticClass:"product-title"},[t._v("select size")]),t._v(" "),r("div",{staticClass:"size-box"},[r("ul",t._l(t.Size(t.productData.variants),(function(e,o){return r("li",{key:o},[r("a",{attrs:{href:"javascript:void(0)"}},[t._v(t._s(e))])])})),0)])]):t._e(),t._v(" "),r("div",{staticClass:"border-product"},[r("h6",{staticClass:"product-title"},[t._v("product details")]),t._v(" "),r("p",[t._v(t._s(t.productData.description.substring(0,250)+"...."))])]),t._v(" "),r("div",{staticClass:"product-buttons"},[r("a",{staticClass:"btn btn-solid",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.addToCart(t.product)}}},[t._v("add to cart")]),t._v(" "),r("nuxt-link",{staticClass:"btn btn-solid",attrs:{to:{path:"/product/sidebar/"+t.productData.id}}},[t._v("view detail")])],1)])])])]):t._e()],1)}),[],!1,null,null,null);e.a=component.exports},381:function(t,e,r){"use strict";var o={props:["openCompare","productData"],methods:{getImgUrl:function(path){return r(366)("./"+path)},closeCompare:function(t){this.$emit("closeCompare",!1)}}},c=r(35),component=Object(c.a)(o,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[t.openCompare?r("b-modal",{attrs:{id:"modal-compare",size:"lg",centered:"",title:"Compare","hide-footer":!0,"hide-header":!0}},[r("div",{staticClass:"row compare-modal"},[r("div",{staticClass:"col-lg-12"},[r("button",{staticClass:"close",attrs:{type:"button"},on:{click:function(e){return t.closeCompare(t.openCompare)}}},[r("span",[t._v("×")])]),t._v(" "),r("div",{staticClass:"media"},[r("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(t.productData.images[0].src),alt:t.productData.images[0].alt}}),t._v(" "),r("div",{staticClass:"media-body align-self-center text-center"},[r("h5",[r("i",{staticClass:"fa fa-check"}),t._v("Item\n              "),r("span",[t._v(t._s(t.productData.title))]),t._v(" "),r("span",[t._v("successfully added to your Compare list")])]),t._v(" "),r("div",{staticClass:"buttons d-flex justify-content-center"},[r("nuxt-link",{staticClass:"btn-sm btn-solid",attrs:{to:{path:"/page/compare/compare-1"}}},[t._v("View Compare list")])],1)])])])])]):t._e()],1)}),[],!1,null,null,null);e.a=component.exports},384:function(t,e,r){"use strict";r(6),r(4),r(3),r(2),r(5),r(51);var o=r(0),c=r(30);function l(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function n(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?l(Object(source),!0).forEach((function(e){Object(o.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):l(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var d={props:["openCart","productData","products","category"],computed:n(n({},Object(c.c)({currency:function(t){return t.products.currency}})),Object(c.b)({curr:"products/changeCurrency"})),methods:{getImgUrl:function(path){return r(366)("./"+path)},closeCart:function(t){this.$emit("closeCart",!1)},cartRelatedProducts:function(t,e){return this.products.filter((function(r){if(r.collection.find((function(i){return i===t}))&&r.id!==e)return r}))},discountedPrice:function(t){return t.price-t.price*t.discount/100}}},v=r(35),component=Object(v.a)(d,(function(){var t=this,e=t.$createElement,o=t._self._c||e;return o("div",[t.openCart?o("b-modal",{attrs:{id:"modal-cart",size:"lg",centered:"",title:"Add-to-cart","hide-footer":!0,"hide-header":!0}},[o("div",{staticClass:"row cart-modal"},[o("div",{staticClass:"col-lg-12"},[o("button",{staticClass:"close",attrs:{type:"button"},on:{click:function(e){return t.closeCart(t.openCart)}}},[o("span",[t._v("×")])]),t._v(" "),o("div",{staticClass:"media"},[o("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(t.productData.images[0].src),alt:t.productData.images[0].alt}}),t._v(" "),o("div",{staticClass:"media-body align-self-center text-center"},[o("h5",[o("i",{staticClass:"fa fa-check"}),t._v("Item\n              "),o("span",[t._v(t._s(t.productData.title))]),t._v(" "),o("span",[t._v("successfully added to your Cart.")])]),t._v(" "),o("div",{staticClass:"buttons d-flex justify-content-center"},[o("nuxt-link",{staticClass:"btn-sm btn-solid mr-2",attrs:{to:{path:"/page/account/cart"}}},[t._v("View Cart")]),t._v(" "),o("nuxt-link",{staticClass:"btn-sm btn-solid mr-2",attrs:{to:{path:"/page/account/checkout"}}},[t._v("Checkout")]),t._v(" "),o("nuxt-link",{staticClass:"btn-sm btn-solid",attrs:{to:{path:"/"}}},[t._v("Continue Shopping")])],1),t._v(" "),o("div",{staticClass:"upsell_payment"},[o("img",{staticClass:"img-fluid w-auto mt-3",attrs:{alt:"",src:r(397)}})])])]),t._v(" "),o("div",{staticClass:"product-section"},[o("div",{staticClass:"col-12 product-upsell text-center"},[o("h4",[t._v("Customers who bought this item also.")])]),t._v(" "),o("div",{staticClass:"row"},t._l(t.cartRelatedProducts(t.productData.collection[0],t.productData.id).slice(0,4),(function(e,r){return o("div",{key:r,staticClass:"product-box col-sm-3 col-6"},[o("div",{staticClass:"img-wrapper"},[o("div",{staticClass:"front"},[o("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[o("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:e.title}})])],1),t._v(" "),o("div",{staticClass:"product-detail"},[o("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[o("h6",[t._v(t._s(e.title))])]),t._v(" "),e.sale?o("h4",[t._v(t._s(t._f("currency")(t.discountedPrice(e)*t.curr.curr,t.curr.symbol))+"\n                        "),o("del",[t._v(t._s(t._f("currency")(e.price*t.curr.curr,t.curr.symbol)))])]):o("h4",[t._v(t._s(t._f("currency")(e.price*t.curr.curr,t.curr.symbol)))])],1)])])})),0)])])])]):t._e()],1)}),[],!1,null,null,null);e.a=component.exports},388:function(t,e,r){"use strict";var o={data:function(){return{imagepath:r(399)}},mounted:function(){"newsletter"!==localStorage.getItem("showModel")&&(this.showModal(),localStorage.setItem("showModel","newsletter"))},methods:{showModal:function(){this.$refs["my-modal"].show()},hideModal:function(){this.$refs["my-modal"].hide()}}},c=r(35),component=Object(c.a)(o,(function(){var t=this.$createElement,e=this._self._c||t;return e("div",[e("b-modal",{ref:"my-modal",attrs:{id:"modal-newsletter",size:"lg",centered:"","hide-footer":!0}},[e("div",{staticClass:"modal-body modal1"},[e("div",{staticClass:"container-fluid p-0"},[e("div",{staticClass:"row"},[e("div",{staticClass:"col-12"},[e("div",{staticClass:"modal-bg"},[e("div",{staticClass:"offer-content"},[e("img",{staticClass:"img-fluid",attrs:{src:this.imagepath,alt:"offer"}}),this._v(" "),e("h2",[this._v("newsletter")]),this._v(" "),e("form",{staticClass:"auth-form needs-validation",attrs:{target:"_blank"}},[e("div",{staticClass:"form-group mx-sm-3"},[e("input",{staticClass:"form-control",attrs:{type:"email",name:"EMAIL",placeholder:"Enter your email",required:"required"}}),this._v(" "),e("button",{staticClass:"btn btn-solid",attrs:{type:"submit",id:"mc-submit"}},[this._v("subscribe")])])])])])])])])])])],1)}),[],!1,null,null,null);e.a=component.exports},613:function(t,e,r){"use strict";r.r(e);var o={data:function(){return{swiperOption:{navigation:{nextEl:".swiper-button-next",prevEl:".swiper-button-prev"}},items:[{imagepath:r(382),title:"electronic",subtitle:"flat 40% off",alignclass:"p-left"},{imagepath:r(382),title:"headphone",subtitle:"save 55% on",alignclass:"p-left"}]}}},c=r(35),component=Object(c.a)(o,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("section",{staticClass:"pt-0 padding-bottom-cls"},[r("div",{staticClass:"slide-1 home-slider"},[r("div",{directives:[{name:"swiper",rawName:"v-swiper:mySwiper",value:t.swiperOption,expression:"swiperOption",arg:"mySwiper"}]},[r("div",{staticClass:"swiper-wrapper"},t._l(t.items,(function(e,o){return r("div",{key:o,staticClass:"swiper-slide"},[r("div",{staticClass:"home text-center",class:e.alignclass,style:{"background-image":"url("+e.imagepath+")"}},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col"},[r("div",{staticClass:"slider-contain"},[r("div",[r("h4",[t._v(t._s(e.title))]),t._v(" "),r("h1",[t._v(t._s(e.subtitle))]),t._v(" "),r("nuxt-link",{staticClass:"btn btn-solid",attrs:{to:{path:"/collection/left-sidebar"}}},[t._v("shop now")])],1)])])])])])])})),0),t._v(" "),r("div",{staticClass:"swiper-button-prev",attrs:{slot:"button-prev"},slot:"button-prev"}),t._v(" "),r("div",{staticClass:"swiper-button-next",attrs:{slot:"button-next"},slot:"button-next"})])])])])}),[],!1,null,null,null);e.default=component.exports},614:function(t,e,r){"use strict";r.r(e);var o={data:function(){return{items:[{imagepath:r(475),title:"speaker",subtitle:"30% off"},{imagepath:r(476),title:"earplug",subtitle:"save 60%"},{imagepath:r(477),title:"best deal",subtitle:"save 55%"}]}}},c=r(35),component=Object(c.a)(o,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("section",{staticClass:"banner-goggles ratio2_3"},[r("div",{staticClass:"container-fluid"},[r("div",{staticClass:"row partition3"},t._l(t.items,(function(e,o){return r("div",{key:o,staticClass:"col-md-4"},[r("a",{attrs:{href:"#"}},[r("div",{staticClass:"collection-banner p-left text-center"},[r("div",{staticClass:"img-part"},[r("img",{staticClass:"img-fluid",attrs:{src:e.imagepath,alt:""}})]),t._v(" "),r("div",{staticClass:"contain-banner banner-3"},[r("div",[r("h4",[t._v(t._s(e.subtitle))]),t._v(" "),r("h2",[t._v(t._s(e.title))])])])])])])})),0)])])])}),[],!1,null,null,null);e.default=component.exports}}]);