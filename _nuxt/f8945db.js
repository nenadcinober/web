(window.webpackJsonp=window.webpackJsonp||[]).push([[7],{354:function(t,e,r){"use strict";r(5),r(3),r(2),r(1),r(4),r(53);var c=r(0),o=r(34);function n(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function l(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?n(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):n(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var d={props:["openCart","productData","products","category"],computed:l(l({},Object(o.c)({currency:function(t){return t.products.currency}})),Object(o.b)({curr:"products/changeCurrency"})),methods:{getImgUrl:function(path){return r(353)("./"+path)},closeCart:function(t){this.$emit("closeCart",!1)},cartRelatedProducts:function(t,e){return this.products.filter((function(r){if(r.collection.find((function(i){return i===t}))&&r.id!==e)return r}))},discountedPrice:function(t){return t.price-t.price*t.discount/100}}},f=r(52),component=Object(f.a)(d,(function(){var t=this,e=t.$createElement,c=t._self._c||e;return c("div",[t.openCart?c("b-modal",{attrs:{id:"modal-cart",size:"lg",centered:"",title:"Add-to-cart","hide-footer":!0,"hide-header":!0}},[c("div",{staticClass:"row cart-modal"},[c("div",{staticClass:"col-lg-12"},[c("button",{staticClass:"close",attrs:{type:"button"},on:{click:function(e){return t.closeCart(t.openCart)}}},[c("span",[t._v("×")])]),t._v(" "),c("div",{staticClass:"media"},[c("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(t.productData.images[0].src),alt:t.productData.images[0].alt}}),t._v(" "),c("div",{staticClass:"media-body align-self-center text-center"},[c("h5",[c("i",{staticClass:"fa fa-check"}),t._v("Item\n              "),c("span",[t._v(t._s(t.productData.title))]),t._v(" "),c("span",[t._v("successfully added to your Cart.")])]),t._v(" "),c("div",{staticClass:"buttons d-flex justify-content-center"},[c("nuxt-link",{staticClass:"btn-sm btn-solid mr-2",attrs:{to:{path:"/page/account/cart"}}},[t._v("View Cart")]),t._v(" "),c("nuxt-link",{staticClass:"btn-sm btn-solid mr-2",attrs:{to:{path:"/page/account/checkout"}}},[t._v("Checkout")]),t._v(" "),c("nuxt-link",{staticClass:"btn-sm btn-solid",attrs:{to:{path:"/"}}},[t._v("Continue Shopping")])],1),t._v(" "),c("div",{staticClass:"upsell_payment"},[c("img",{staticClass:"img-fluid w-auto mt-3",attrs:{alt:"",src:r(355)}})])])]),t._v(" "),c("div",{staticClass:"product-section"},[c("div",{staticClass:"col-12 product-upsell text-center"},[c("h4",[t._v("Customers who bought this item also.")])]),t._v(" "),c("div",{staticClass:"row"},t._l(t.cartRelatedProducts(t.productData.collection[0],t.productData.id).slice(0,4),(function(e,r){return c("div",{key:r,staticClass:"product-box col-sm-3 col-6"},[c("div",{staticClass:"img-wrapper"},[c("div",{staticClass:"front"},[c("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[c("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:e.title}})])],1),t._v(" "),c("div",{staticClass:"product-detail"},[c("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[c("h6",[t._v(t._s(e.title))])]),t._v(" "),e.sale?c("h4",[t._v(t._s(t._f("currency")(t.discountedPrice(e)*t.curr.curr,t.curr.symbol))+"\n                        "),c("del",[t._v(t._s(t._f("currency")(e.price*t.curr.curr,t.curr.symbol)))])]):c("h4",[t._v(t._s(t._f("currency")(e.price*t.curr.curr,t.curr.symbol)))])],1)])])})),0)])])])]):t._e()],1)}),[],!1,null,null,null);e.a=component.exports},356:function(t,e,r){"use strict";r.r(e);r(5),r(3),r(2),r(1),r(4);var c=r(0),o=r(34),header=r(351),n=r(352),l=r(354);function d(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}var f={computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?d(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):d(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(o.c)({locale:function(t){return t.i18n.locale}})),data:function(){return{swiperOption:{loop:!0,navigation:{nextEl:".swiper-button-next",prevEl:".swiper-button-prev"}},items:[{imagepath:r(358),title:"welcome to fashion",subtitle:"women fashion",alignclass:"p-left"},{imagepath:r(357),title:"welcome to fashion",subtitle:"men fashion",alignclass:"p-left"}]}}},v=r(52),h=Object(v.a)(f,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",t._l(t.items,(function(e,c){return r("div",{key:c,staticClass:"paralax",style:{"background-image":"url("+e.imagepath+")"}},[r("a",{staticClass:"height-full",attrs:{href:"/"+t.locale+"/collection/all"}},[r("div",{staticClass:"col-xs-1 text-center"},[r("div",{staticClass:"vertical-center"},[r("div",{staticClass:"container"},[r("div",{staticClass:"trans-box"},[r("h4",{staticStyle:{color:"black"}},[t._v(t._s(e.title))]),t._v(" "),r("h1",[t._v(t._s(e.subtitle))]),t._v(" "),r("nuxt-link",{staticClass:"btn btn-solid",attrs:{to:{path:"/"+t.locale+"/collection/all"}}},[t._v(t._s(t.$t("start")))])],1)])])])])])})),0)}),[],!1,null,null,null).exports;function m(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}var O={components:{Header:header.a,Footer:n.a,cartModel:l.a,Paralax:h},data:function(){return{products:[],category:[],showcartmodal:!1,cartproduct:{}}},computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?m(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):m(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(o.c)({productslist:function(t){return t.products.productslist}})),mounted:function(){this.productsArray()},methods:{productsArray:function(){var t=this;this.productslist.map((function(e){"fashion"===e.type&&(t.products.push(e),e.collection.map((function(i){-1===t.category.indexOf(i)&&t.category.push(i)})))}))},showCart:function(t,e){this.showcartmodal=t,this.cartproduct=e},closeCartModal:function(t){this.showcartmodal=t}}},y=Object(v.a)(O,(function(){var t=this.$createElement,e=this._self._c||t;return e("div",[e("Header"),this._v(" "),e("Paralax"),this._v(" "),e("Footer"),this._v(" "),e("cartModel",{attrs:{openCart:this.showcartmodal,productData:this.cartproduct,products:this.products},on:{closeCart:this.closeCartModal}})],1)}),[],!1,null,null,null);e.default=y.exports}}]);