(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{352:function(t,e,r){"use strict";var c={props:["title"]},l=r(50),component=Object(l.a)(c,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("div",{staticClass:"breadcrumb-section"},[r("div",{staticClass:"container"},[r("div",{staticClass:"row"},[r("div",{staticClass:"col-sm-6"},[r("div",{staticClass:"page-title"},[r("h2",[t._v(t._s(t.title))])])]),t._v(" "),r("div",{staticClass:"col-sm-6"},[r("nav",{staticClass:"theme-breadcrumb",attrs:{"aria-label":"breadcrumb"}},[r("ol",{staticClass:"breadcrumb"},[r("li",{staticClass:"breadcrumb-item"},[r("nuxt-link",{attrs:{to:{path:"/"}}},[t._v("Home")])],1),t._v(" "),t.title?r("li",{staticClass:"breadcrumb-item active"},[t._v(t._s(t.title))]):t._e()])])])])])])])}),[],!1,null,null,null);e.a=component.exports},366:function(t,e,r){"use strict";r(6),r(4),r(3),r(1),r(5),r(51);var c=r(0),l=r(34);function o(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function n(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?o(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):o(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var d={props:["openCart","productData","products","category"],computed:n(n({},Object(l.c)({currency:function(t){return t.products.currency}})),Object(l.b)({curr:"products/changeCurrency"})),methods:{getImgUrl:function(path){return r(355)("./"+path)},closeCart:function(t){this.$emit("closeCart",!1)},cartRelatedProducts:function(t,e){return this.products.filter((function(r){if(r.collection.find((function(i){return i===t}))&&r.id!==e)return r}))},discountedPrice:function(t){return t.price-t.price*t.discount/100}}},v=r(50),component=Object(v.a)(d,(function(){var t=this,e=t.$createElement,c=t._self._c||e;return c("div",[t.openCart?c("b-modal",{attrs:{id:"modal-cart",size:"lg",centered:"",title:"Add-to-cart","hide-footer":!0,"hide-header":!0}},[c("div",{staticClass:"row cart-modal"},[c("div",{staticClass:"col-lg-12"},[c("button",{staticClass:"close",attrs:{type:"button"},on:{click:function(e){return t.closeCart(t.openCart)}}},[c("span",[t._v("×")])]),t._v(" "),c("div",{staticClass:"media"},[c("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(t.productData.images[0].src),alt:t.productData.images[0].alt}}),t._v(" "),c("div",{staticClass:"media-body align-self-center text-center"},[c("h5",[c("i",{staticClass:"fa fa-check"}),t._v("Item\n              "),c("span",[t._v(t._s(t.productData.title))]),t._v(" "),c("span",[t._v("successfully added to your Cart.")])]),t._v(" "),c("div",{staticClass:"buttons d-flex justify-content-center"},[c("nuxt-link",{staticClass:"btn-sm btn-solid mr-2",attrs:{to:{path:"/page/account/cart"}}},[t._v("View Cart")]),t._v(" "),c("nuxt-link",{staticClass:"btn-sm btn-solid mr-2",attrs:{to:{path:"/page/account/checkout"}}},[t._v("Checkout")]),t._v(" "),c("nuxt-link",{staticClass:"btn-sm btn-solid",attrs:{to:{path:"/"}}},[t._v("Continue Shopping")])],1),t._v(" "),c("div",{staticClass:"upsell_payment"},[c("img",{staticClass:"img-fluid w-auto mt-3",attrs:{alt:"",src:r(384)}})])])]),t._v(" "),c("div",{staticClass:"product-section"},[c("div",{staticClass:"col-12 product-upsell text-center"},[c("h4",[t._v("Customers who bought this item also.")])]),t._v(" "),c("div",{staticClass:"row"},t._l(t.cartRelatedProducts(t.productData.collection[0],t.productData.id).slice(0,4),(function(e,r){return c("div",{key:r,staticClass:"product-box col-sm-3 col-6"},[c("div",{staticClass:"img-wrapper"},[c("div",{staticClass:"front"},[c("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[c("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:e.title}})])],1),t._v(" "),c("div",{staticClass:"product-detail"},[c("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[c("h6",[t._v(t._s(e.title))])]),t._v(" "),e.sale?c("h4",[t._v(t._s(t._f("currency")(t.discountedPrice(e)*t.curr.curr,t.curr.symbol))+"\n                        "),c("del",[t._v(t._s(t._f("currency")(e.price*t.curr.curr,t.curr.symbol)))])]):c("h4",[t._v(t._s(t._f("currency")(e.price*t.curr.curr,t.curr.symbol)))])],1)])])})),0)])])])]):t._e()],1)}),[],!1,null,null,null);e.a=component.exports},371:function(t,e,r){"use strict";r(6),r(4),r(3),r(1),r(5);var c=r(0),l=r(34);r(381);function o(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function n(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?o(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):o(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var d={props:["product","index"],data:function(){return{imageSrc:"",quickviewProduct:{},compareProduct:{},cartProduct:{},showquickview:!1,showCompareModal:!1,cartval:!1,variants:{productId:"",image:""},dismissSecs:5,dismissCountDown:0}},computed:n(n({},Object(l.c)({productslist:function(t){return t.products.productslist}})),Object(l.b)({curr:"products/changeCurrency"})),methods:{getImgUrl:function(path){return r(355)("./"+path)},addToCart:function(t){this.cartval=!0,this.cartProduct=t,this.$emit("opencartmodel",this.cartval,this.cartProduct),this.$store.dispatch("cart/addToCart",t)},addToWishlist:function(t){this.dismissCountDown=this.dismissSecs,this.$emit("showalert",this.dismissCountDown),this.$store.dispatch("products/addToWishlist",t)},showQuickview:function(t){this.showquickview=!0,this.quickviewProduct=t,this.$emit("openquickview",this.showquickview,this.quickviewProduct)},addToCompare:function(t){this.showCompareModal=!0,this.compareProduct=t,this.$emit("showCompareModal",this.showCompareModal,this.compareProduct),this.$store.dispatch("products/addToCompare",t)},Color:function(t){for(var e=[],i=0;i<Object.keys(t).length;i++)-1===e.indexOf(t[i].color)&&e.push(t[i].color);return e},productColorchange:function(t,e){var r=this;e.variants.map((function(c){c.color===t&&e.images.map((function(img){img.image_id===c.image_id&&(r.imageSrc=img.src)}))}))},productVariantChange:function(t){console.log("I am calll"),this.imageSrc=t},countDownChanged:function(t){this.dismissCountDown=t,this.$emit("alertseconds",this.dismissCountDown)},discountedPrice:function(t){return t.price-t.price*t.discount/100}}},v=r(50),component=Object(v.a)(d,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("div",{staticClass:"img-wrapper"},[r("div",{staticClass:"lable-block"},[t.product.new?r("span",{staticClass:"lable3"},[t._v("new")]):t._e(),t._v(" "),t.product.sale?r("span",{staticClass:"lable4"},[t._v("on sale")]):t._e()]),t._v(" "),r("div",{staticClass:"front"},[r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+t.product.id}}},[r("img",{key:t.index,staticClass:"img-fluid bg-img",attrs:{src:t.getImgUrl(t.imageSrc?t.imageSrc:t.product.images[0].src),id:t.product.id,alt:t.product.title}})])],1),t._v(" "),r("ul",{staticClass:"product-thumb-list"},t._l(t.product.images,(function(image,e){return r("li",{key:e,staticClass:"grid_thumb_img",class:{active:t.imageSrc===image.src},on:{click:function(e){return t.productVariantChange(image.src)}}},[r("a",{attrs:{href:"javascript:void(0);"}},[r("img",{attrs:{src:t.getImgUrl(image.src)}})])])})),0),t._v(" "),r("div",{staticClass:"cart-info cart-wrap"},[r("button",{directives:[{name:"b-modal",rawName:"v-b-modal.modal-cart",modifiers:{"modal-cart":!0}}],attrs:{"data-toggle":"modal","data-target":"#addtocart",title:"Add to cart",variant:"primary"},on:{click:function(e){return t.addToCart(t.product)}}},[r("i",{staticClass:"ti-shopping-cart"})]),t._v(" "),r("a",{attrs:{href:"javascript:void(0)",title:"Wishlist"}},[r("i",{staticClass:"ti-heart",attrs:{"aria-hidden":"true"},on:{click:function(e){return t.addToWishlist(t.product)}}})]),t._v(" "),r("a",{directives:[{name:"b-modal",rawName:"v-b-modal.modal-lg",modifiers:{"modal-lg":!0}}],attrs:{href:"javascript:void(0)",title:"Quick View",variant:"primary"},on:{click:function(e){return t.showQuickview(t.product)}}},[r("i",{staticClass:"ti-search",attrs:{"aria-hidden":"true"}})]),t._v(" "),r("a",{directives:[{name:"b-modal",rawName:"v-b-modal.modal-compare",modifiers:{"modal-compare":!0}}],attrs:{href:"javascript:void(0)",title:"Comapre",variant:"primary"},on:{click:function(e){return t.addToCompare(t.product)}}},[r("i",{staticClass:"ti-reload",attrs:{"aria-hidden":"true"}})])])]),t._v(" "),r("div",{staticClass:"product-detail"},[t._m(0),t._v(" "),r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+t.product.id}}},[r("h6",[t._v(t._s(t.product.title))])]),t._v(" "),r("p",[t._v(t._s(t.product.description))]),t._v(" "),t.product.sale?r("h4",[t._v("\n      "+t._s(t._f("currency")(t.discountedPrice(t.product)*t.curr.curr,t.curr.symbol))+"\n      "),r("del",[t._v(t._s(t._f("currency")(t.product.price*t.curr.curr,t.curr.symbol)))])]):r("h4",[t._v(t._s(t._f("currency")(t.product.price*t.curr.curr,t.curr.symbol)))]),t._v(" "),t.product.variants[0].color?r("ul",{staticClass:"color-variant"},t._l(t.Color(t.product.variants),(function(e,c){return r("li",{key:c},[r("a",{class:[e],style:{"background-color":e},on:{click:function(r){return t.productColorchange(e,t.product)}}})])})),0):t._e()],1)])}),[function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"rating"},[e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"})])}],!1,null,null,null);e.a=component.exports},409:function(t,e,r){"use strict";r(6),r(4),r(3),r(1),r(5),r(51);var c=r(0),l=r(34),o=r(845);function n(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function d(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?n(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):n(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var v={data:function(){return{bannerimagepath:r(385),value:[50,550],selectedcolor:[],selectedbrand:[],selectedsize:[],applyFilter:[],activeItem:"category",filter:!1,swiperOption:{loop:!1,navigation:{nextEl:".swiper-button-next",prevEl:".swiper-button-prev"}}}},components:{VueSlider:r.n(o).a},computed:d(d({},Object(l.c)({productslist:function(t){return t.products.productslist},currency:function(t){return t.products.currency}})),Object(l.b)({filterbyCategory:"filter/filterbyCategory",filterbyBrand:"filter/filterbyBrand",filterbycolor:"filter/filterbycolor",filterbysize:"filter/filterbysize"})),mounted:function(){this.$emit("priceVal",this.value)},methods:{getCategoryProduct:function(t){return this.productslist.filter((function(e){if(e.collection.find((function(i){return i===t})))return e}))},getImgUrl:function(path){return r(355)("./"+path)},discountedPrice:function(t){return t.price-t.price*t.discount/100},isActive:function(t){return this.applyFilter.indexOf(t)>-1},appliedFilter:function(t){this.$emit("allFilters",this.applyFilter)},sliderChange:function(t){this.$emit("priceVal",t)},toggleSidebarBlock:function(){this.openBlock=!this.openBlock},getCategoryFilter:function(t){this.$store.dispatch("filter/getCategoryFilter",t)}}},f=r(50),component=Object(f.a)(v,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("div",{staticClass:"row"},[r("div",{staticClass:"col-xl-12"},[r("div",{staticClass:"filter-main-btn",on:{click:function(e){t.filter=!t.filter}}},[t._m(0)])])]),t._v(" "),r("div",{staticClass:"collection-filter",class:{openFilterbar:t.filter}},[r("div",{staticClass:"collection-filter-block"},[r("div",{staticClass:"collection-mobile-back"},[r("span",{staticClass:"filter-back",on:{click:function(e){t.filter=!t.filter}}},[r("i",{staticClass:"fa fa-angle-left",attrs:{"aria-hidden":"true"}}),t._v(" back\n      ")])]),t._v(" "),r("div",{staticClass:"collection-collapse-block open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.category",modifiers:{category:!0}}],staticClass:"collapse-block-title"},[t._v("Category")]),t._v(" "),r("b-collapse",{attrs:{id:"category",visible:"",accordion:"myaccordion",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"collection-brand-filter"},[r("ul",{staticClass:"category-list"},[r("li",[r("nuxt-link",{attrs:{to:{path:"/collection/leftsidebar/all"}}},[t._v("All products")])],1),t._v(" "),t._l(t.filterbyCategory,(function(e,c){return r("li",{key:c},[r("nuxt-link",{attrs:{to:{path:"/collection/leftsidebar/"+e}},on:{click:function(r){return t.getCategoryFilter(e)}}},[t._v(t._s(e))])],1)}))],2)])])])],1)]),t._v(" "),r("div",{staticClass:"collection-filter-block"},[t.filterbyBrand.length?r("div",{staticClass:"collection-collapse-block open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.brand",modifiers:{brand:!0}}],staticClass:"collapse-block-title"},[t._v("brand")]),t._v(" "),r("b-collapse",{attrs:{id:"brand",visible:"",accordion:"myaccordion1",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"collection-brand-filter"},t._l(t.filterbyBrand,(function(e,c){return r("div",{key:c,staticClass:"custom-control custom-checkbox collection-filter-checkbox"},[r("input",{directives:[{name:"model",rawName:"v-model",value:t.applyFilter,expression:"applyFilter"}],staticClass:"custom-control-input",attrs:{type:"checkbox",id:e},domProps:{value:e,checked:Array.isArray(t.applyFilter)?t._i(t.applyFilter,e)>-1:t.applyFilter},on:{change:[function(r){var c=t.applyFilter,l=r.target,o=!!l.checked;if(Array.isArray(c)){var n=e,d=t._i(c,n);l.checked?d<0&&(t.applyFilter=c.concat([n])):d>-1&&(t.applyFilter=c.slice(0,d).concat(c.slice(d+1)))}else t.applyFilter=o},function(r){return t.appliedFilter(e)}]}}),t._v(" "),r("label",{staticClass:"custom-control-label",attrs:{for:e}},[t._v(t._s(e))])])})),0)])])],1):t._e(),t._v(" "),t.filterbycolor.length?r("div",{staticClass:"collection-collapse-block open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.colors",modifiers:{colors:!0}}],staticClass:"collapse-block-title"},[t._v("colors")]),t._v(" "),r("b-collapse",{attrs:{id:"colors",visible:"",accordion:"myaccordion2",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"collection-brand-filter color-filter"},t._l(t.filterbycolor,(function(e,c){return r("div",{key:c,staticClass:"custom-control custom-checkbox collection-filter-checkbox"},[r("input",{directives:[{name:"model",rawName:"v-model",value:t.applyFilter,expression:"applyFilter"}],staticClass:"custom-control-input",attrs:{type:"checkbox",id:e},domProps:{value:e,checked:Array.isArray(t.applyFilter)?t._i(t.applyFilter,e)>-1:t.applyFilter},on:{change:[function(r){var c=t.applyFilter,l=r.target,o=!!l.checked;if(Array.isArray(c)){var n=e,d=t._i(c,n);l.checked?d<0&&(t.applyFilter=c.concat([n])):d>-1&&(t.applyFilter=c.slice(0,d).concat(c.slice(d+1)))}else t.applyFilter=o},function(r){return t.appliedFilter(e)}]}}),t._v(" "),r("span",{class:e,style:{"background-color":e}}),t._v(" "),r("label",{staticClass:"custom-control-label",class:{selected:t.isActive(e)},attrs:{for:e}},[t._v(t._s(e))])])})),0)])])],1):t._e(),t._v(" "),t.filterbysize.length?r("div",{staticClass:"collection-collapse-block open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.size",modifiers:{size:!0}}],staticClass:"collapse-block-title"},[t._v("Size")]),t._v(" "),r("b-collapse",{attrs:{id:"size",visible:"",accordion:"myaccordion3",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"color-selector"},[r("div",{staticClass:"collection-brand-filter"},t._l(t.filterbysize,(function(e,c){return r("div",{key:c,staticClass:"custom-control custom-checkbox collection-filter-checkbox"},[r("input",{directives:[{name:"model",rawName:"v-model",value:t.applyFilter,expression:"applyFilter"}],staticClass:"custom-control-input",attrs:{type:"checkbox",id:e},domProps:{value:e,checked:Array.isArray(t.applyFilter)?t._i(t.applyFilter,e)>-1:t.applyFilter},on:{change:[function(r){var c=t.applyFilter,l=r.target,o=!!l.checked;if(Array.isArray(c)){var n=e,d=t._i(c,n);l.checked?d<0&&(t.applyFilter=c.concat([n])):d>-1&&(t.applyFilter=c.slice(0,d).concat(c.slice(d+1)))}else t.applyFilter=o},function(r){return t.appliedFilter(e)}]}}),t._v(" "),r("label",{staticClass:"custom-control-label",attrs:{for:e}},[t._v(t._s(e))])])})),0)])])])],1):t._e(),t._v(" "),r("div",{staticClass:"collection-collapse-block border-0 open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.price",modifiers:{price:!0}}],staticClass:"collapse-block-title"},[t._v("price")]),t._v(" "),r("b-collapse",{attrs:{id:"price",visible:"",accordion:"myaccordion4",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"collection-brand-filter price-rangee-picker"},[r("vue-slider",{ref:"slider",attrs:{min:0,max:800},on:{change:function(e){t.sliderChange(t.$refs.slider.getValue())}},model:{value:t.value,callback:function(e){t.value=e},expression:"value"}})],1)])])],1)]),t._v(" "),r("div",{staticClass:"theme-card"},[r("h5",{staticClass:"title-border"},[t._v("new products")]),t._v(" "),r("div",{staticClass:"offer-slider slide-1"},[r("div",{directives:[{name:"swiper",rawName:"v-swiper:mySwiper",value:t.swiperOption,expression:"swiperOption",arg:"mySwiper"}]},[r("div",{staticClass:"swiper-wrapper"},[r("div",{staticClass:"swiper-slide"},[r("div",t._l(t.getCategoryProduct("new products").splice(0,3),(function(e,c){return r("div",{key:c,staticClass:"media"},[r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[r("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:""}})]),t._v(" "),r("div",{staticClass:"media-body align-self-center"},[t._m(1,!0),t._v(" "),r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[r("h6",[t._v(t._s(e.title))])]),t._v(" "),e.sale?r("h4",[t._v("\n                        "+t._s(t._f("currency")(t.discountedPrice(e)*t.currency.curr,t.currency.symbol))+"\n                        "),r("del",[t._v(t._s(t._f("currency")(e.price*t.currency.curr,t.currency.symbol)))])]):r("h4",[t._v(t._s(t._f("currency")(e.price*t.currency.curr,t.currency.symbol)))])],1)],1)})),0)]),t._v(" "),t.getCategoryProduct("new products").length>=4?r("div",{staticClass:"swiper-slide"},[r("div",t._l(t.getCategoryProduct("new products").splice(3,3),(function(e,c){return r("div",{key:c,staticClass:"media"},[r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[r("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:""}})]),t._v(" "),r("div",{staticClass:"media-body align-self-center"},[t._m(2,!0),t._v(" "),r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[r("h6",[t._v(t._s(e.title))])]),t._v(" "),e.sale?r("h4",[t._v("\n                        "+t._s(t._f("currency")(t.discountedPrice(e)*t.currency.curr,t.currency.symbol))+"\n                        "),r("del",[t._v(t._s(t._f("currency")(e.price*t.currency.curr,t.currency.symbol)))])]):r("h4",[t._v(t._s(t._f("currency")(e.price*t.currency.curr,t.currency.symbol)))])],1)],1)})),0)]):t._e()]),t._v(" "),r("div",{staticClass:"swiper-button-prev",attrs:{slot:"button-prev"},slot:"button-prev"},[r("i",{staticClass:"fa fa-angle-left",attrs:{"aria-hidden":"true"}})]),t._v(" "),r("div",{staticClass:"swiper-button-next",attrs:{slot:"button-next"},slot:"button-next"},[r("i",{staticClass:"fa fa-angle-right",attrs:{"aria-hidden":"true"}})])])])]),t._v(" "),r("div",{staticClass:"collection-sidebar-banner"},[r("a",{attrs:{href:"#"}},[r("img",{staticClass:"img-fluid",attrs:{src:t.bannerimagepath}})])])])])}),[function(){var t=this.$createElement,e=this._self._c||t;return e("span",{staticClass:"filter-btn btn btn-theme"},[e("i",{staticClass:"fa fa-filter",attrs:{"aria-hidden":"true"}}),this._v(" Filter\n          ")])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"rating"},[e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"})])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"rating"},[e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"}),this._v(" "),e("i",{staticClass:"fa fa-star"})])}],!1,null,null,null);e.a=component.exports}}]);