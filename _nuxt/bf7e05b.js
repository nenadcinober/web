(window.webpackJsonp=window.webpackJsonp||[]).push([[20],{863:function(t,e,r){"use strict";r.r(e);r(6),r(3),r(2),r(1),r(5),r(51);var o=r(0),c=r(30),l=r(363),n=r(354),d=r(355),h=r(356),v=r(412),f=r(358),m=r(359),w=r(361);function C(object,t){var e=Object.keys(object);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(object);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(object,t).enumerable}))),e.push.apply(e,r)}return e}function _(t){for(var i=1;i<arguments.length;i++){var source=null!=arguments[i]?arguments[i]:{};i%2?C(Object(source),!0).forEach((function(e){Object(o.a)(t,e,source[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(source)):C(Object(source)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(source,e))}))}return t}var y={components:{Header:n.a,Footer:d.a,Breadcrumbs:h.a,productBox1:l.a,sidebar:v.a,quickviewModel:f.a,compareModel:m.a,cartModel:w.a},data:function(){return{bannerimagepath:r(385),col2:!1,col3:!0,col4:!1,col6:!1,listview:!1,priceArray:[],allfilters:[],items:[],current:1,paginate:12,paginateRange:3,pages:[],paginates:"",showquickviewmodel:!1,showcomparemodal:!1,showcartmodal:!1,quickviewproduct:{},comapreproduct:{},cartproduct:{},dismissSecs:5,dismissCountDown:0,swiperOption:{loop:!1,navigation:{nextEl:".swiper-button-next",prevEl:".swiper-button-prev"}}}},computed:_(_({},Object(c.c)({productslist:function(t){return t.products.productslist},currency:function(t){return t.products.currency}})),Object(c.b)({filterProduct:"filter/filterProducts",tags:"filter/setTags",curr:"products/changeCurrency"})),mounted:function(){this.updatePaginate(1)},methods:{getCategoryProduct:function(t){return this.productslist.filter((function(e){if(e.collection.find((function(i){return i===t})))return e}))},getImgUrl:function(path){return r(357)("./"+path)},discountedPrice:function(t){return t.price-t.price*t.discount/100},onChangeSort:function(t){this.$store.dispatch("filter/sortProducts",t.target.value)},gridView:function(){this.col4=!0,this.col2=!1,this.col3=!1,this.col6=!1,this.listview=!1},listView:function(){this.listview=!0,this.col4=!1,this.col2=!1,this.col3=!1,this.col6=!1},grid2:function(){this.col2=!0,this.col3=!1,this.col4=!1,this.col6=!1,this.listview=!1},grid3:function(){this.col3=!0,this.col2=!1,this.col4=!1,this.col6=!1,this.listview=!1},grid4:function(){this.col4=!0,this.col2=!1,this.col3=!1,this.col6=!1,this.listview=!1},grid6:function(){this.col6=!0,this.col2=!1,this.col3=!1,this.col4=!1,this.listview=!1},removeTags:function(t){this.allfilters.splice(this.allfilters.indexOf(t),1)},removeAllTags:function(){this.allfilters.splice(0,this.allfilters.length)},getCategoryFilter:function(){this.updatePaginate(1),this.$store.dispatch("filter/getCategoryFilter",this.$route.params.id)},allfilter:function(t){this.allfilters=t,this.$store.dispatch("filter/setTags",t),this.getPaginate(),this.updatePaginate(1)},pricefilterArray:function(t){this.getCategoryFilter(),this.$store.dispatch("filter/priceFilter",t),this.getPaginate(),this.updatePaginate(1)},getPaginate:function(){this.paginates=Math.round(this.filterProduct.length/this.paginate),this.pages=[];for(var i=0;i<this.paginates;i++)this.pages.push(i+1)},setPaginate:function(i){return 1===this.current?i<this.paginate:i>=this.paginate*(this.current-1)&&i<this.current*this.paginate},updatePaginate:function(i){this.current=i;var t=0,e=0;this.current<this.paginateRange-1?e=(t=1)+this.paginateRange-1:(t=this.current-1,e=this.current+1),t<1&&(t=1),e>this.paginates&&(e=this.paginates),this.pages=[];for(var r=t;r<=e;r++)this.pages.push(r);return this.pages},alert:function(t){this.dismissCountDown=t},showQuickview:function(t,e){this.showquickviewmodel=t,this.quickviewproduct=e},showCoampre:function(t,e){this.showcomparemodal=t,this.comapreproduct=e},closeCompareModal:function(t){this.showcomparemodal=t},showCart:function(t,e){this.showcartmodal=t,this.cartproduct=e},closeCartModal:function(t){this.showcartmodal=t}}},k=r(35),component=Object(k.a)(y,(function(){var t=this,e=t.$createElement,o=t._self._c||e;return o("div",[o("Header"),t._v(" "),o("Breadcrumbs",{attrs:{title:"collection"}}),t._v(" "),o("section",{staticClass:"section-b-space ratio_asos"},[o("div",{staticClass:"collection-wrapper"},[o("div",{staticClass:"container"},[o("div",{staticClass:"row"},[o("div",{staticClass:"col-lg-3"},[o("sidebar",{on:{allFilters:t.allfilter,priceVal:t.pricefilterArray,categoryfilter:t.getCategoryFilter}})],1),t._v(" "),o("div",{staticClass:"collection-content col"},[o("div",{staticClass:"page-main-content"},[o("div",{staticClass:"row"},[o("div",{staticClass:"col-sm-12"},[o("div",{staticClass:"top-banner-wrapper"},[o("a",{attrs:{href:"#"}},[o("img",{staticClass:"img-fluid",attrs:{src:r(383),alt:""}})]),t._v(" "),t._m(0)]),t._v(" "),o("ul",{staticClass:"product-filter-tags"},[t._l(t.allfilters,(function(e,r){return o("li",{key:r,staticClass:"mr-1"},[o("a",{staticClass:"filter_tag",attrs:{href:"javascript:void(0)"}},[t._v(t._s(e)),o("i",{staticClass:"ti-close",on:{click:function(r){return t.removeTags(e)}}})])])})),t._v(" "),t.allfilters.length>0?o("li",{staticClass:"clear_filter"},[o("a",{staticClass:"clear_filter",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.removeAllTags()}}},[t._v("Clear all")])]):t._e()],2),t._v(" "),o("div",{staticClass:"collection-product-wrapper"},[o("div",{staticClass:"product-top-filter"},[o("div",{staticClass:"row"},[o("div",{staticClass:"col-12"},[o("div",{staticClass:"product-filter-content"},[o("div",{staticClass:"search-count"},[o("h5",[t._v("Showing Products 1-12 of "+t._s(t.filterProduct.length)+" Result")])]),t._v(" "),o("div",{staticClass:"collection-view"},[o("ul",[o("li",{on:{click:function(e){return t.gridView()}}},[o("i",{staticClass:"fa fa-th grid-layout-view"})]),t._v(" "),o("li",{on:{click:function(e){return t.listView()}}},[o("i",{staticClass:"fa fa-list-ul list-layout-view"})])])]),t._v(" "),o("div",{staticClass:"collection-grid-view"},[o("ul",[o("li",[o("img",{staticClass:"product-2-layout-view",attrs:{src:r(389)},on:{click:function(e){return t.grid2()}}})]),t._v(" "),o("li",[o("img",{staticClass:"product-3-layout-view",attrs:{src:r(390)},on:{click:function(e){return t.grid3()}}})]),t._v(" "),o("li",[o("img",{staticClass:"product-4-layout-view",attrs:{src:r(391)},on:{click:function(e){return t.grid4()}}})]),t._v(" "),o("li",[o("img",{staticClass:"product-6-layout-view",attrs:{src:r(392)},on:{click:function(e){return t.grid6()}}})])])]),t._v(" "),o("div",{staticClass:"product-page-filter"},[o("select",{on:{change:function(e){return t.onChangeSort(e)}}},[o("option",{attrs:{value:"all"}},[t._v("Sorting Items")]),t._v(" "),o("option",{attrs:{value:"a-z"}},[t._v("Alphabetically, A-Z")]),t._v(" "),o("option",{attrs:{value:"z-a"}},[t._v("Alphabetically, Z-A")]),t._v(" "),o("option",{attrs:{value:"low"}},[t._v("price, low to high")]),t._v(" "),o("option",{attrs:{value:"high"}},[t._v("price, high to low")])])])])])])]),t._v(" "),o("div",{staticClass:"product-wrapper-grid",class:{"list-view":1==t.listview}},[o("div",{staticClass:"row"},[o("div",{staticClass:"col-sm-12"},[0==t.filterProduct.length?o("div",{staticClass:"text-center section-t-space section-b-space"},[o("img",{staticClass:"img-fluid",attrs:{src:r(388),alt:""}}),t._v(" "),o("h3",{staticClass:"mt-3"},[t._v("Sorry! Couldn't find the product you were looking For!!!")]),t._v(" "),o("div",{staticClass:"col-12 mt-3"},[o("nuxt-link",{staticClass:"btn btn-solid",attrs:{to:{path:"/"}}},[t._v("continue shopping")])],1)]):t._e()]),t._v(" "),t._l(t.filterProduct,(function(e,r){return o("div",{directives:[{name:"show",rawName:"v-show",value:t.setPaginate(r),expression:"setPaginate(index)"}],key:r,staticClass:"col-grid-box",class:{"col-lg-3 col-md-4 col-sm-6":1==t.col4,"col-lg-4 col-sm-6":1==t.col3,"col-sm-6":1==t.col2,"col-lg-2 col-md-4 col-sm-6":1==t.col6,"col-lg-12":1==t.listview}},[o("div",{staticClass:"product-box"},[o("productBox1",{attrs:{product:e,index:r},on:{opencartmodel:t.showCart,showCompareModal:t.showCoampre,openquickview:t.showQuickview,showalert:t.alert,alertseconds:t.alert}})],1)])}))],2)]),t._v(" "),t.filterProduct.length>this.paginate?o("div",{staticClass:"product-pagination mb-0"},[o("div",{staticClass:"theme-paggination-block"},[o("div",{staticClass:"row"},[o("div",{staticClass:"col-xl-6 col-md-6 col-sm-12"},[o("nav",{attrs:{"aria-label":"Page navigation"}},[o("ul",{staticClass:"pagination"},[o("li",{staticClass:"page-item"},[o("a",{staticClass:"page-link",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.updatePaginate(t.current-1)}}},[t._m(1)])]),t._v(" "),t._l(this.pages,(function(e,r){return o("li",{key:r,staticClass:"page-item",class:{active:e==t.current}},[o("a",{staticClass:"page-link",attrs:{href:"javascrip:void(0)"},on:{click:function(r){return r.preventDefault(),t.updatePaginate(e)}}},[t._v(t._s(e))])])})),t._v(" "),o("li",{staticClass:"page-item"},[o("a",{staticClass:"page-link",attrs:{href:"javascript:void(0)"},on:{click:function(e){return t.updatePaginate(t.current+1)}}},[t._m(2)])])],2)])]),t._v(" "),o("div",{staticClass:"col-xl-6 col-md-6 col-sm-12"},[o("div",{staticClass:"product-search-count-bottom"},[o("h5",[t._v("Showing Products 1-12 of "+t._s(t.filterProduct.length)+" Result")])])])])])]):t._e()])])])])])])])])]),t._v(" "),o("b-alert",{attrs:{show:t.dismissCountDown,variant:"success"},on:{dismissed:function(e){t.dismissCountDown=0},"dismiss-count-down":t.alert}},[o("p",[t._v("Product Is successfully added to your wishlist.")])]),t._v(" "),o("quickviewModel",{attrs:{openModal:t.showquickviewmodel,productData:t.quickviewproduct}}),t._v(" "),o("compareModel",{attrs:{openCompare:t.showcomparemodal,productData:t.comapreproduct},on:{closeCompare:t.closeCompareModal}}),t._v(" "),o("cartModel",{attrs:{openCart:t.showcartmodal,productData:t.cartproduct,products:t.filterProduct},on:{closeCart:t.closeCartModal}}),t._v(" "),o("Footer")],1)}),[function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"top-banner-content small-section"},[e("h4",[this._v("fashion")]),this._v(" "),e("h5",[this._v("Lorem Ipsum is simply dummy text of the printing and typesetting industry.")]),this._v(" "),e("p",[this._v("Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.")])])},function(){var t=this.$createElement,e=this._self._c||t;return e("span",{attrs:{"aria-hidden":"true"}},[e("i",{staticClass:"fa fa-chevron-left",attrs:{"aria-hidden":"true"}})])},function(){var t=this.$createElement,e=this._self._c||t;return e("span",{attrs:{"aria-hidden":"true"}},[e("i",{staticClass:"fa fa-chevron-right",attrs:{"aria-hidden":"true"}})])}],!1,null,null,null);e.default=component.exports}}]);