(window.webpackJsonp=window.webpackJsonp||[]).push([[87],{409:function(t,r,o){"use strict";o(6),o(4),o(3),o(2),o(5);var c=o(0),e=o(30);function n(object,t){var r=Object.keys(object);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(object);t&&(o=o.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),r.push.apply(r,o)}return r}function d(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?n(Object(source),!0).forEach((function(r){Object(c.a)(t,r,source[r])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):n(Object(source)).forEach((function(r){Object.defineProperty(t,r,Object.getOwnPropertyDescriptor(source,r))}))}return t}var l={props:["product","index"],data:function(){return{imageSrc:"",quickviewProduct:{},compareProduct:{},showquickview:!1,showCompareModal:!1,cartval:!1,variants:{productId:"",image:""},dismissSecs:5,dismissCountDown:0}},computed:d(d({},Object(e.c)({productslist:function(t){return t.products.productslist}})),Object(e.b)({curr:"products/changeCurrency"})),methods:{getImgUrl:function(path){return o(368)("./"+path)},addToCart:function(t){this.cartval=!0,this.$emit("opencartmodel",this.cartval),this.$store.dispatch("cart/addToCart",t)},addToWishlist:function(t){this.dismissCountDown=this.dismissSecs,this.$emit("showalert",this.dismissCountDown),this.$store.dispatch("products/addToWishlist",t)},showQuickview:function(t){this.showquickview=!0,this.$emit("openquickview",this.showquickview,t)},addToCompare:function(t){this.showCompareModal=!0,this.compareProduct=t,this.$emit("showCompareModal",this.showCompareModal,this.compareProduct),this.$store.dispatch("products/addToCompare",t)},Color:function(t){for(var r=[],i=0;i<Object.keys(t).length;i++)-1===r.indexOf(t[i].color)&&r.push(t[i].color);return r},productColorchange:function(t,r,o){var c=this;r.variants.map((function(e){e.color===t&&r.images.map((function(img){img.image_id===e.image_id&&(c.productslist[o].vImage=img.src)}))}))},countDownChanged:function(t){this.dismissCountDown=t,this.$emit("alertseconds",this.dismissCountDown)},discountedPrice:function(t){return t.price-t.price*t.discount/100}}},h=o(35),component=Object(h.a)(l,(function(){var t=this,r=t.$createElement,o=t._self._c||r;return o("div",[o("div",{staticClass:"img-wrapper"},[o("div",{staticClass:"lable-block"},[t.product.new?o("span",{staticClass:"lable3"},[t._v("new")]):t._e()]),t._v(" "),o("div",{staticClass:"front"},[o("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+t.product.id}}},[o("img",{key:t.index,staticClass:"img-fluid bg-img",attrs:{src:t.getImgUrl(t.imageSrc?t.imageSrc:t.product.images[0].src),id:t.product.id,alt:t.product.title}})])],1),t._v(" "),o("ul",{staticClass:"product-thumb-list"},t._l(t.product.images,(function(image,r){return o("li",{key:r,staticClass:"grid_thumb_img",class:{active:t.imageSrc==image.src}},[o("a",{attrs:{href:"javascript:void(0);"}},[o("img",{attrs:{src:t.getImgUrl(image.src),alt:"'image.alt'"}})])])})),0),t._v(" "),o("div",{staticClass:"cart-detail"},[o("a",{attrs:{href:"javascript:void(0)",title:"Wishlist"}},[o("i",{staticClass:"ti-heart",attrs:{"aria-hidden":"true"},on:{click:function(r){return t.addToWishlist(t.product)}}})]),t._v(" "),o("a",{directives:[{name:"b-modal",rawName:"v-b-modal.modal-lg",modifiers:{"modal-lg":!0}}],attrs:{href:"javascript:void(0)",title:"Quick View",variant:"primary"},on:{click:function(r){return t.showQuickview(t.product)}}},[o("i",{staticClass:"ti-search",attrs:{"aria-hidden":"true"}})]),t._v(" "),o("a",{directives:[{name:"b-modal",rawName:"v-b-modal.modal-compare",modifiers:{"modal-compare":!0}}],attrs:{href:"javascript:void(0)",title:"Comapre",variant:"primary"},on:{click:function(r){return t.addToCompare(t.product)}}},[o("i",{staticClass:"ti-reload",attrs:{"aria-hidden":"true"}})])])]),t._v(" "),o("div",{staticClass:"product-info"},[t._m(0),t._v(" "),o("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+t.product.id}}},[o("h6",[t._v(t._s(t.product.title))])]),t._v(" "),o("p",[t._v(t._s(t.product.description))]),t._v(" "),t.product.sale?o("h4",[t._v("\n      "+t._s(t._f("currency")(t.discountedPrice(t.product)*t.curr.curr,t.curr.symbol))+"\n      "),o("del",[t._v(t._s(t._f("currency")(t.product.price*t.curr.curr,t.curr.symbol)))])]):o("h4",[t._v(t._s(t._f("currency")(t.product.price*t.curr.curr,t.curr.symbol)))]),t._v(" "),t.product.variants[0].color?o("ul",{staticClass:"color-variant"},t._l(t.Color(t.product.variants),(function(r,c){return o("li",{key:c},[o("a",{class:[r],style:{"background-color":r},on:{click:function(o){return t.productColorchange(r,t.product,t.index)}}})])})),0):t._e(),t._v(" "),o("div",{staticClass:"add-btn"},[o("button",{staticClass:"btn btn-outline",attrs:{"data-toggle":"modal","data-target":"#addtocart",title:"Add to cart"},on:{click:function(r){return t.addToCart(t.product)}}},[o("i",{staticClass:"ti-shopping-cart"}),t._v(" add to cart\n      ")])])],1)])}),[function(){var t=this.$createElement,r=this._self._c||t;return r("div",{staticClass:"rating"},[r("i",{staticClass:"fa fa-star"}),this._v(" "),r("i",{staticClass:"fa fa-star"}),this._v(" "),r("i",{staticClass:"fa fa-star"}),this._v(" "),r("i",{staticClass:"fa fa-star"}),this._v(" "),r("i",{staticClass:"fa fa-star"})])}],!1,null,null,null);r.a=component.exports},599:function(t,r,o){"use strict";o.r(r);o(51);var c={props:["products","category"],components:{productBox3:o(409).a},data:function(){return{title:"our collection",subtitle:"special products",showCart:!1,showquickviewmodel:!1,showcomapreModal:!1,quickviewproduct:{},comapreproduct:{},cartproduct:{},dismissSecs:5,dismissCountDown:0}},methods:{getCategoryProduct:function(t){return this.products.filter((function(r){if(r.collection.find((function(i){return i===t})))return r}))},alert:function(t){this.dismissCountDown=t},showCartModal:function(t){this.showCart=t,this.$emit("openCart",this.showCart)},showquickview:function(t,r){this.showquickviewmodel=t,this.quickviewproduct=r,this.$emit("openQuickview",this.showquickviewmodel,this.quickviewproduct)},showcomparemodal:function(t,r){this.showcomapreModal=t,this.comapreproduct=r,this.$emit("openCompare",this.showcomapreModal,this.comapreproduct)}}},e=o(35),component=Object(e.a)(c,(function(){var t=this,r=t.$createElement,o=t._self._c||r;return o("div",[o("section",{staticClass:"section-b-space ratio_square"},[o("div",{staticClass:"container"},[o("div",{staticClass:"title2"},[o("h4",[t._v(t._s(t.subtitle))]),t._v(" "),o("h2",{staticClass:"title-inner2"},[t._v(t._s(t.title))])]),t._v(" "),o("div",{staticClass:"row"},[o("div",{staticClass:"col"},[o("div",{staticClass:"theme-tab"},[o("b-tabs",{attrs:{"content-class":"mt-3"}},t._l(t.category,(function(r,c){return o("b-tab",{key:c,attrs:{title:r}},[o("div",{staticClass:"no-slider row"},t._l(t.getCategoryProduct(r).splice(0,4),(function(r,c){return o("div",{key:c,staticClass:"product-box"},[o("productBox3",{attrs:{product:r,index:c},on:{opencartmodel:t.showCartModal,showCompareModal:t.showcomparemodal,openquickview:t.showquickview,showalert:t.alert,alertseconds:t.alert}})],1)})),0)])})),1)],1)])])])]),t._v(" "),o("b-alert",{attrs:{show:t.dismissCountDown,variant:"success"},on:{dismissed:function(r){t.dismissCountDown=0},"dismiss-count-down":t.alert}},[o("p",[t._v("Product Is successfully added to your wishlist.")])])],1)}),[],!1,null,null,null);r.default=component.exports}}]);