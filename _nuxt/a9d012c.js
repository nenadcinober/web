(window.webpackJsonp=window.webpackJsonp||[]).push([[1,7,11,13],{826:function(t,e,r){"use strict";r.r(e);r(5),r(3),r(2),r(1),r(4),r(53);var c=r(0),l=r(16);function o(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function n(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?o(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):o(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var d={props:["openCart","productData","products","category"],computed:n(n({},Object(l.c)({currency:function(t){return t.products.currency}})),Object(l.b)({curr:"products/changeCurrency"})),methods:{getImgUrl:function(path){return r(224)("./"+path)},closeCart:function(t){this.$emit("closeCart",false)},cartRelatedProducts:function(t,e){return this.products.filter((function(r){if(r.collection.find((function(i){return i===t}))&&r.id!==e)return r}))},discountedPrice:function(t){return t.price-t.price*t.discount/100}}},v=r(23),component=Object(v.a)(d,(function(){var t=this,e=t.$createElement,c=t._self._c||e;return c("div",[t.openCart?c("b-modal",{attrs:{id:"modal-cart",size:"lg",centered:"",title:"Add-to-cart","hide-footer":!0,"hide-header":!0}},[c("div",{staticClass:"row cart-modal"},[c("div",{staticClass:"col-lg-12"},[c("button",{staticClass:"close",attrs:{type:"button"},on:{click:function(e){return t.closeCart(t.openCart)}}},[c("span",[t._v("×")])]),t._v(" "),c("div",{staticClass:"media"},[c("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(t.productData.images[0].src),alt:t.productData.images[0].alt}}),t._v(" "),c("div",{staticClass:"media-body align-self-center text-center"},[c("h5",[c("i",{staticClass:"fa fa-check"}),t._v("Item\n              "),c("span",[t._v(t._s(t.productData.title))]),t._v(" "),c("span",[t._v("successfully added to your Cart.")])]),t._v(" "),c("div",{staticClass:"buttons d-flex justify-content-center"},[c("nuxt-link",{staticClass:"btn-sm btn-solid mr-2",attrs:{to:{path:"/cart"}}},[t._v("View Cart")]),t._v(" "),c("nuxt-link",{staticClass:"btn-sm btn-solid mr-2",attrs:{to:{path:"/checkout"}}},[t._v("Checkout")]),t._v(" "),c("nuxt-link",{staticClass:"btn-sm btn-solid",attrs:{to:{path:"/"}}},[t._v("Continue Shopping")])],1),t._v(" "),c("div",{staticClass:"upsell_payment"},[c("img",{staticClass:"img-fluid w-auto mt-3",attrs:{alt:"",src:r(227)}})])])]),t._v(" "),c("div",{staticClass:"product-section"},[c("div",{staticClass:"col-12 product-upsell text-center"},[c("h4",[t._v("Customers who bought this item also.")])]),t._v(" "),c("div",{staticClass:"row"},t._l(t.cartRelatedProducts(t.productData.collection[0],t.productData.id).slice(0,4),(function(e,r){return c("div",{key:r,staticClass:"product-box col-sm-3 col-6"},[c("div",{staticClass:"img-wrapper"},[c("div",{staticClass:"front"},[c("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[c("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:e.title}})])],1),t._v(" "),c("div",{staticClass:"product-detail"},[c("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[c("h6",[t._v(t._s(e.title))])]),t._v(" "),e.sale?c("h4",[t._v(t._s(t._f("currency")(t.discountedPrice(e)*t.curr.curr,t.curr.symbol))+"\n                        "),c("del",[t._v(t._s(t._f("currency")(e.price*t.curr.curr,t.curr.symbol)))])]):c("h4",[t._v(t._s(t._f("currency")(e.price*t.curr.curr,t.curr.symbol)))])],1)])])})),0)])])])]):t._e()],1)}),[],!1,null,null,null);e.default=component.exports},827:function(t,e,r){"use strict";r.r(e);r(5),r(3),r(2),r(1),r(4);var c=r(0),l=r(16),o=r(830),n=r(842),d=r(826);function v(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}var f={components:{productBox1:o.default,sidebar:n.default,cartModel:d.default},data:function(){return{bannerimagepath:r(231),col2:!1,col3:!1,col4:!0,col6:!1,listview:!1,priceArray:[],allfilters:[],items:[],current:1,paginate:12,paginateRange:3,pages:[],paginates:"",showcartmodal:!1,cartproduct:{},dismissSecs:5,dismissCountDown:0,swiperOption:{loop:!1,navigation:{nextEl:".swiper-button-next",prevEl:".swiper-button-prev"}}}},computed:function(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?v(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):v(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}({},Object(l.b)({filterProduct:"filter/filterProducts",tags:"filter/setTags",curr:"products/changeCurrency"})),mounted:function(){this.updatePaginate(1)},methods:{onChangeSort:function(t){this.$store.dispatch("filter/sortProducts",t.target.value)},gridView:function(){this.col4=!0,this.col2=!1,this.col3=!1,this.col6=!1,this.listview=!1},listView:function(){this.listview=!0,this.col4=!1,this.col2=!1,this.col3=!1,this.col6=!1},grid2:function(){this.col2=!0,this.col3=!1,this.col4=!1,this.col6=!1,this.listview=!1},grid3:function(){this.col3=!0,this.col2=!1,this.col4=!1,this.col6=!1,this.listview=!1},grid4:function(){this.col4=!0,this.col2=!1,this.col3=!1,this.col6=!1,this.listview=!1},grid6:function(){this.col6=!0,this.col2=!1,this.col3=!1,this.col4=!1,this.listview=!1},removeTags:function(t){this.allfilters.splice(this.allfilters.indexOf(t),1)},removeAllTags:function(){this.allfilters.splice(0,this.allfilters.length)},getCategoryFilter:function(){this.updatePaginate(1),this.$store.dispatch("filter/getCategoryFilter","all")},allfilter:function(t){this.allfilters=t,this.$store.dispatch("filter/setTags",t),this.getPaginate(),this.updatePaginate(1)},pricefilterArray:function(t){this.getCategoryFilter(),this.$store.dispatch("filter/priceFilter",t),this.getPaginate(),this.updatePaginate(1)},getPaginate:function(){this.paginates=Math.round(this.filterProduct.length/this.paginate),this.pages=[];for(var i=0;i<this.paginates;i++)this.pages.push(i+1)},setPaginate:function(i){return 1===this.current?i<this.paginate:i>=this.paginate*(this.current-1)&&i<this.current*this.paginate},updatePaginate:function(i){this.current=i;var t=0,e=0;this.current<this.paginateRange-1?e=(t=1)+this.paginateRange-1:(t=this.current-1,e=this.current+1),t<1&&(t=1),e>this.paginates&&(e=this.paginates),this.pages=[];for(var r=t;r<=e;r++)this.pages.push(r);return this.pages},alert:function(t){this.dismissCountDown=t},showCart:function(t,e){this.showcartmodal=t,this.cartproduct=e},closeCartModal:function(t){this.showcartmodal=t}}},h=r(23),component=Object(h.a)(f,(function(){var t=this,e=t.$createElement,c=t._self._c||e;return c("div",[c("section",{staticClass:"section-b-space ratio_asos",staticStyle:{"padding-top":"120px"}},[c("div",{staticClass:"collection-wrapper"},[c("div",{staticClass:"container-fluid"},[c("div",{staticClass:"row"},[c("div",{staticClass:"col-lg-3 d-none"},[c("sidebar",{on:{allFilters:t.allfilter,priceVal:t.pricefilterArray,categoryfilter:t.getCategoryFilter}})],1),t._v(" "),c("div",{staticClass:"collection-content col"},[c("div",{staticClass:"page-main-content"},[c("div",{staticClass:"row"},[c("div",{staticClass:"col-sm-12"},[c("ul",{staticClass:"product-filter-tags"},[t._l(t.allfilters,(function(e,r){return c("li",{key:r,staticClass:"mr-1"},[c("a",{staticClass:"filter_tag",attrs:{href:"javascript:void(0)"}},[t._v(t._s(e)),c("i",{staticClass:"ti-close",on:{click:function(r){return t.removeTags(e)}}})])])})),t._v(" "),t.allfilters.length>0?c("li",{staticClass:"clear_filter"},[c("a",{staticClass:"clear_filter",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.removeAllTags()}}},[t._v("Clear all")])]):t._e()],2),t._v(" "),c("div",{staticClass:"collection-product-wrapper"},[c("div",{staticClass:"product-top-filter"},[c("div",{staticClass:"row"},[c("div",{staticClass:"col-12"},[c("div",{staticClass:"product-filter-content"},[c("div",{staticClass:"search-count",staticStyle:{border:"0"}},[c("h5",[t._v(t._s(t.$t("showing"))+" "+t._s(t.filterProduct.length)+" "+t._s(t.$t("showing_products")))])]),t._v(" "),c("div",{staticClass:"product-page-filter"},[c("select",{on:{change:function(e){return t.onChangeSort(e)}}},[c("option",{attrs:{value:"all"}},[t._v(t._s(t.$t("sort")))]),t._v(" "),c("option",{attrs:{value:"a-z"}},[t._v("A-Z")]),t._v(" "),c("option",{attrs:{value:"z-a"}},[t._v("Z-A")]),t._v(" "),c("option",{attrs:{value:"low"}},[t._v(t._s(t.$t("sort_price_low_to_high")))]),t._v(" "),c("option",{attrs:{value:"high"}},[t._v("price, high to low")])])])])])])]),t._v(" "),c("div",{staticClass:"product-wrapper-grid",class:{"list-view":1==t.listview}},[c("div",{staticClass:"row"},[c("div",{staticClass:"col-sm-12"},[0==t.filterProduct.length?c("div",{staticClass:"text-center section-t-space section-b-space"},[c("img",{staticClass:"img-fluid",attrs:{src:r(236),alt:""}}),t._v(" "),c("h3",{staticClass:"mt-3"},[t._v("Sorry! Couldn't find the product you were looking For!!!")]),t._v(" "),c("div",{staticClass:"col-12 mt-3"},[c("nuxt-link",{staticClass:"btn btn-solid",attrs:{to:{path:"/"}}},[t._v("continue shopping")])],1)]):t._e()]),t._v(" "),t._l(t.filterProduct,(function(e,r){return c("div",{directives:[{name:"show",rawName:"v-show",value:t.setPaginate(r),expression:"setPaginate(index)"}],key:r,staticClass:"col-grid-box",class:{"col-lg-3":1==t.col4,"col-lg-4":1==t.col3,"col-lg-6":1==t.col2,"col-lg-2":1==t.col6,"col-lg-12":1==t.listview}},[c("div",{staticClass:"product-box"},[c("productBox1",{attrs:{product:e,index:r},on:{opencartmodel:t.showCart,showalert:t.alert,alertseconds:t.alert}})],1)])}))],2)]),t._v(" "),t.filterProduct.length>this.paginate?c("div",{staticClass:"product-pagination mb-0"},[c("div",{staticClass:"theme-paggination-block"},[c("div",{staticClass:"row"},[c("div",{staticClass:"col-xl-6 col-md-6 col-sm-12"},[c("nav",{attrs:{"aria-label":"Page navigation"}},[c("ul",{staticClass:"pagination"},[c("li",{staticClass:"page-item",class:{disable:1==t.current}},[c("a",{staticClass:"page-link",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.updatePaginate(t.current-1)}}},[t._m(0)])]),t._v(" "),t._l(this.pages,(function(e,r){return c("li",{key:r,staticClass:"page-item",class:{active:e==t.current}},[c("a",{staticClass:"page-link",attrs:{href:"javascrip:void(0)"},on:{click:function(r){return r.preventDefault(),t.updatePaginate(e)}}},[t._v(t._s(e))])])})),t._v(" "),c("li",{staticClass:"page-item",class:{disable:t.current==this.paginates}},[c("a",{staticClass:"page-link",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.updatePaginate(t.current+1)}}},[t._m(1)])])],2)])]),t._v(" "),c("div",{staticClass:"col-xl-6 col-md-6 col-sm-12"},[c("div",{staticClass:"product-search-count-bottom"},[c("h5",[t._v("Showing Products 1-12 of "+t._s(t.filterProduct.length)+" Result")])])])])])]):t._e()])])])])])])])])]),t._v(" "),c("b-alert",{attrs:{show:t.dismissCountDown,variant:"success"},on:{dismissed:function(e){t.dismissCountDown=0},"dismiss-count-down":t.alert}},[c("p",[t._v("Product Is successfully added to your wishlist.")])]),t._v(" "),c("cartModel",{attrs:{openCart:t.showcartmodal,productData:t.cartproduct,products:t.filterProduct},on:{closeCart:t.closeCartModal}})],1)}),[function(){var t=this.$createElement,e=this._self._c||t;return e("span",{attrs:{"aria-hidden":"true"}},[e("i",{staticClass:"fa fa-chevron-left",attrs:{"aria-hidden":"true"}})])},function(){var t=this.$createElement,e=this._self._c||t;return e("span",{attrs:{"aria-hidden":"true"}},[e("i",{staticClass:"fa fa-chevron-right",attrs:{"aria-hidden":"true"}})])}],!1,null,null,null);e.default=component.exports},830:function(t,e,r){"use strict";r.r(e);r(5),r(3),r(2),r(1),r(4);var c=r(0),l=r(16);function o(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function n(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?o(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):o(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var d={props:["product","index"],data:function(){return{imageSrc:"",cartProduct:{},cartval:!1,variants:{productId:"",image:""},dismissSecs:5,dismissCountDown:0}},computed:n(n(n({},Object(l.c)({productslist:function(t){return t.products.productslist},locale:function(t){return t.i18n.locale}})),Object(l.b)({curr:"products/changeCurrency"})),{},{productsUrl:function(){return"/"+this.locale+"/"+this.$t("productsurl")}}),methods:{getImgUrl:function(path){return r(224)("./"+path)},Color:function(t){for(var e=[],i=0;i<Object.keys(t).length;i++)-1===e.indexOf(t[i].color)&&e.push(t[i].color);return e},productColorchange:function(t,e){var r=this;e.variants.map((function(c){c.color===t&&e.images.map((function(img){img.image_id===c.image_id&&(r.imageSrc=img.src)}))}))},productVariantChange:function(t){console.log("I am calll"),this.imageSrc=t},countDownChanged:function(t){this.dismissCountDown=t,this.$emit("alertseconds",this.dismissCountDown)},discountedPrice:function(t){return t.price-t.price*t.discount/100}}},v=r(23),component=Object(v.a)(d,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("div",{staticClass:"img-wrapper"},[r("div",{staticClass:"lable-block"},[t.product.new?r("span",{staticClass:"lable3"},[t._v(t._s(t.$t("new")))]):t._e(),t._v(" "),t.product.sale?r("span",{staticClass:"lable4"},[t._v(t._s(t.$t("onsale")))]):t._e()]),t._v(" "),r("div",{staticClass:"front"},[r("nuxt-link",{attrs:{to:{path:this.productsUrl+"/"+t.product.id}}},[r("img",{key:t.index,staticClass:"img-fluid bg-img",attrs:{src:t.getImgUrl(t.imageSrc?t.imageSrc:t.product.images[0].src),id:t.product.id,alt:t.product.title}})])],1),t._v(" "),r("ul",{staticClass:"product-thumb-list"},t._l(t.product.images,(function(image,e){return r("li",{key:e,staticClass:"grid_thumb_img",class:{active:t.imageSrc===image.src},on:{click:function(e){return t.productVariantChange(image.src)}}},[r("a",{attrs:{href:"javascript:void(0);"}},[r("img",{attrs:{src:t.getImgUrl(image.src)}})])])})),0)]),t._v(" "),r("div",{staticClass:"product-detail"},[r("nuxt-link",{attrs:{to:{path:this.productsUrl+"/"+t.product.id}}},[r("h6",[t._v(t._s(t.product.title))])]),t._v(" "),r("p",[t._v(t._s(t.product.description))]),t._v(" "),t.product.sale?r("h4",[t._v("\n      "+t._s(t.discountedPrice(t.product)*t.curr.curr)+" €\n      "),r("del",[t._v(t._s(t.product.price*t.curr.curr)+" €")])]):r("h4",[t._v(t._s(t.product.price*t.curr.curr)+" €")])],1)])}),[],!1,null,null,null);e.default=component.exports},842:function(t,e,r){"use strict";r.r(e);r(5),r(3),r(2),r(1),r(4),r(53);var c=r(0),l=r(16),o=r(837);function n(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function d(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?n(Object(source),!0).forEach((function(e){Object(c.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):n(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var v={data:function(){return{bannerimagepath:r(231),value:[50,550],selectedcolor:[],selectedbrand:[],selectedsize:[],applyFilter:[],activeItem:"category",filter:!1,swiperOption:{loop:!1,navigation:{nextEl:".swiper-button-next",prevEl:".swiper-button-prev"}}}},components:{VueSlider:r.n(o).a},computed:d(d({},Object(l.c)({productslist:function(t){return t.products.productslist},currency:function(t){return t.products.currency}})),Object(l.b)({filterbyCategory:"filter/filterbyCategory",filterbycolor:"filter/filterbycolor",filterbysize:"filter/filterbysize"})),mounted:function(){this.$emit("priceVal",this.value)},methods:{getCategoryProduct:function(t){return this.productslist.filter((function(e){if(e.collection.find((function(i){return i===t})))return e}))},getImgUrl:function(path){return r(224)("./"+path)},discountedPrice:function(t){return t.price-t.price*t.discount/100},isActive:function(t){return this.applyFilter.indexOf(t)>-1},appliedFilter:function(t){this.$emit("allFilters",this.applyFilter)},sliderChange:function(t){this.$emit("priceVal",t)},toggleSidebarBlock:function(){this.openBlock=!this.openBlock},getCategoryFilter:function(t){this.$store.dispatch("filter/getCategoryFilter",t)}}},f=r(23),component=Object(f.a)(v,(function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",[r("div",{staticClass:"row"},[r("div",{staticClass:"col-xl-12"},[r("div",{staticClass:"filter-main-btn",on:{click:function(e){t.filter=!t.filter}}},[t._m(0)])])]),t._v(" "),r("div",{staticClass:"collection-filter",class:{openFilterbar:t.filter}},[r("div",{staticClass:"collection-filter-block"},[r("div",{staticClass:"collection-mobile-back"},[r("span",{staticClass:"filter-back",on:{click:function(e){t.filter=!t.filter}}},[r("i",{staticClass:"fa fa-angle-left",attrs:{"aria-hidden":"true"}}),t._v(" back\n      ")])]),t._v(" "),r("div",{staticClass:"collection-collapse-block open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.category",modifiers:{category:!0}}],staticClass:"collapse-block-title"},[t._v("Category")]),t._v(" "),r("b-collapse",{attrs:{id:"category",visible:"",accordion:"myaccordion",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"collection-brand-filter"},[r("ul",{staticClass:"category-list"},[r("li",[r("nuxt-link",{attrs:{to:{path:"/collection/leftsidebar/all"}}},[t._v("All products")])],1),t._v(" "),t._l(t.filterbyCategory,(function(e,c){return r("li",{key:c},[r("nuxt-link",{attrs:{to:{path:"/collection/leftsidebar/"+e}},on:{click:function(r){return t.getCategoryFilter(e)}}},[t._v(t._s(e))])],1)}))],2)])])])],1)]),t._v(" "),r("div",{staticClass:"collection-filter-block"},[t.filterbycolor.length?r("div",{staticClass:"collection-collapse-block open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.colors",modifiers:{colors:!0}}],staticClass:"collapse-block-title"},[t._v("colors")]),t._v(" "),r("b-collapse",{attrs:{id:"colors",visible:"",accordion:"myaccordion2",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"collection-brand-filter color-filter"},t._l(t.filterbycolor,(function(e,c){return r("div",{key:c,staticClass:"custom-control custom-checkbox collection-filter-checkbox"},[r("input",{directives:[{name:"model",rawName:"v-model",value:t.applyFilter,expression:"applyFilter"}],staticClass:"custom-control-input",attrs:{type:"checkbox",id:e},domProps:{value:e,checked:Array.isArray(t.applyFilter)?t._i(t.applyFilter,e)>-1:t.applyFilter},on:{change:[function(r){var c=t.applyFilter,l=r.target,o=!!l.checked;if(Array.isArray(c)){var n=e,d=t._i(c,n);l.checked?d<0&&(t.applyFilter=c.concat([n])):d>-1&&(t.applyFilter=c.slice(0,d).concat(c.slice(d+1)))}else t.applyFilter=o},function(r){return t.appliedFilter(e)}]}}),t._v(" "),r("span",{class:e,style:{"background-color":e}}),t._v(" "),r("label",{staticClass:"custom-control-label",class:{selected:t.isActive(e)},attrs:{for:e}},[t._v(t._s(e))])])})),0)])])],1):t._e(),t._v(" "),t.filterbysize.length?r("div",{staticClass:"collection-collapse-block open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.size",modifiers:{size:!0}}],staticClass:"collapse-block-title"},[t._v("Size")]),t._v(" "),r("b-collapse",{attrs:{id:"size",visible:"",accordion:"myaccordion3",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"color-selector"},[r("div",{staticClass:"collection-brand-filter"},t._l(t.filterbysize,(function(e,c){return r("div",{key:c,staticClass:"custom-control custom-checkbox collection-filter-checkbox"},[r("input",{directives:[{name:"model",rawName:"v-model",value:t.applyFilter,expression:"applyFilter"}],staticClass:"custom-control-input",attrs:{type:"checkbox",id:e},domProps:{value:e,checked:Array.isArray(t.applyFilter)?t._i(t.applyFilter,e)>-1:t.applyFilter},on:{change:[function(r){var c=t.applyFilter,l=r.target,o=!!l.checked;if(Array.isArray(c)){var n=e,d=t._i(c,n);l.checked?d<0&&(t.applyFilter=c.concat([n])):d>-1&&(t.applyFilter=c.slice(0,d).concat(c.slice(d+1)))}else t.applyFilter=o},function(r){return t.appliedFilter(e)}]}}),t._v(" "),r("label",{staticClass:"custom-control-label",attrs:{for:e}},[t._v(t._s(e))])])})),0)])])])],1):t._e(),t._v(" "),r("div",{staticClass:"collection-collapse-block border-0 open"},[r("h3",{directives:[{name:"b-toggle",rawName:"v-b-toggle.price",modifiers:{price:!0}}],staticClass:"collapse-block-title"},[t._v("price")]),t._v(" "),r("b-collapse",{attrs:{id:"price",visible:"",accordion:"myaccordion4",role:"tabpanel"}},[r("div",{staticClass:"collection-collapse-block-content"},[r("div",{staticClass:"collection-brand-filter price-rangee-picker"},[r("vue-slider",{ref:"slider",attrs:{min:0,max:800},on:{change:function(e){t.sliderChange(t.$refs.slider.getValue())}},model:{value:t.value,callback:function(e){t.value=e},expression:"value"}})],1)])])],1)]),t._v(" "),r("div",{staticClass:"theme-card"},[r("h5",{staticClass:"title-border"},[t._v("new products")]),t._v(" "),r("div",{staticClass:"offer-slider slide-1"},[r("div",{directives:[{name:"swiper",rawName:"v-swiper:mySwiper",value:t.swiperOption,expression:"swiperOption",arg:"mySwiper"}]},[r("div",{staticClass:"swiper-wrapper"},[r("div",{staticClass:"swiper-slide"},[r("div",t._l(t.getCategoryProduct("new products").splice(0,3),(function(e,c){return r("div",{key:c,staticClass:"media"},[r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[r("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:""}})]),t._v(" "),r("div",{staticClass:"media-body align-self-center"},[t._m(1,!0),t._v(" "),r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[r("h6",[t._v(t._s(e.title))])]),t._v(" "),e.sale?r("h4",[t._v("\n                        "+t._s(t._f("currency")(t.discountedPrice(e)*t.currency.curr,t.currency.symbol))+"\n                        "),r("del",[t._v(t._s(t._f("currency")(e.price*t.currency.curr,t.currency.symbol)))])]):r("h4",[t._v(t._s(t._f("currency")(e.price*t.currency.curr,t.currency.symbol)))])],1)],1)})),0)]),t._v(" "),t.getCategoryProduct("new products").length>=4?r("div",{staticClass:"swiper-slide"},[r("div",t._l(t.getCategoryProduct("new products").splice(3,3),(function(e,c){return r("div",{key:c,staticClass:"media"},[r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[r("img",{staticClass:"img-fluid",attrs:{src:t.getImgUrl(e.images[0].src),alt:""}})]),t._v(" "),r("div",{staticClass:"media-body align-self-center"},[t._m(2,!0),t._v(" "),r("nuxt-link",{attrs:{to:{path:"/product/sidebar/"+e.id}}},[r("h6",[t._v(t._s(e.title))])]),t._v(" "),e.sale?r("h4",[t._v("\n                        "+t._s(t._f("currency")(t.discountedPrice(e)*t.currency.curr,t.currency.symbol))+"\n                        "),r("del",[t._v(t._s(t._f("currency")(e.price*t.currency.curr,t.currency.symbol)))])]):r("h4",[t._v(t._s(t._f("currency")(e.price*t.currency.curr,t.currency.symbol)))])],1)],1)})),0)]):t._e()]),t._v(" "),r("div",{staticClass:"swiper-button-prev",attrs:{slot:"button-prev"},slot:"button-prev"},[r("i",{staticClass:"fa fa-angle-left",attrs:{"aria-hidden":"true"}})]),t._v(" "),r("div",{staticClass:"swiper-button-next",attrs:{slot:"button-next"},slot:"button-next"},[r("i",{staticClass:"fa fa-angle-right",attrs:{"aria-hidden":"true"}})])])])]),t._v(" "),r("div",{staticClass:"collection-sidebar-banner"},[r("a",{attrs:{href:"#"}},[r("img",{staticClass:"img-fluid",attrs:{src:t.bannerimagepath}})])])])])}),[function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("span",{staticClass:"filter-btn btn btn-theme"},[r("i",{staticClass:"fa fa-filter",attrs:{"aria-hidden":"true"}}),t._v(" Filter\n          ")])},function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"rating"},[r("i",{staticClass:"fa fa-star"}),t._v(" "),r("i",{staticClass:"fa fa-star"}),t._v(" "),r("i",{staticClass:"fa fa-star"}),t._v(" "),r("i",{staticClass:"fa fa-star"}),t._v(" "),r("i",{staticClass:"fa fa-star"})])},function(){var t=this,e=t.$createElement,r=t._self._c||e;return r("div",{staticClass:"rating"},[r("i",{staticClass:"fa fa-star"}),t._v(" "),r("i",{staticClass:"fa fa-star"}),t._v(" "),r("i",{staticClass:"fa fa-star"}),t._v(" "),r("i",{staticClass:"fa fa-star"}),t._v(" "),r("i",{staticClass:"fa fa-star"})])}],!1,null,null,null);e.default=component.exports}}]);