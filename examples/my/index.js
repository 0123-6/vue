debugger

class EventBus {
  constructor() {
    this.events = {};
  }
  on(event, handler) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(handler);
  }
  off(event, handler) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(e => e !== handler);
    }
  }
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(e => e(data))
    }
  }
}

const eventBus = new EventBus()










































// 定义1个食物组件
const FoodComp = {
  name: 'FoodComp',
  template: `
  <div style="display: flex;flex-direction: column;">
    <span>{{info.name}}</span>
    <span>{{info.power}}</span>
  </div>
  `,
  props: {
    food: {
      type: Object,
      required: true,
      default: () => {
        return {
          name: '默认食物',
          power: 100,
        }
      },
    }
  },
  data() {
    return {
      info: null,
    }
  },
  created() {
    this.info = JSON.parse(JSON.stringify(this.food));
    eventBus.on('change-food', this.changeFood)
  },
  methods: {
    changeFood(food) {
      debugger;
      this.info = JSON.parse(JSON.stringify(food));
    }
  },
  beforeDestroy() {
    eventBus.off('change-food', this.changeFood)
  },
}

// 基于FoodComp创建一个新组件
const ShopFood = {
  name: 'ShopFood',
  extends: FoodComp,
  template: `
  <div style="display: flex;flex-direction: column;">
    <span>{{info.name}}</span>
    <span>{{info.power}}</span>
    <span>{{info.price}}</span>
    <span>{{info.number}}</span>
  </div>
  `,
}

// 一个组件
const LoveGirl = {
  name: 'LoveGirl',
  // 模板
  template: `<div style="display: flex;flex-direction: column;"><span @click="click">{{name}}</span><span style="margin-top: 10px;">{{age}}</span><span style="margin-top: 10px;">{{description}}</span><span v-on:click="ok">ok</span><span v-on:click="cancel">cancel</span></div>`,
  // 接收来自父组件的数据的定义
  props: {
    // 名称
    // info: {
    //   type: Object,
    //   required: true,
    // },
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  // watch会优先于dom更新watch的执行
  // 子组件的watch第3触发
  watch: {
    name(value, oldValue) {
      console.log(`name属性变化了,value:${value} , oldValue: ${oldValue}`);
    },
  },
  beforeCreate() {
    console.log('子组件beforeCreate')
  },
  created() {
    console.log('子组件created')
  },
  beforeMount() {
    console.log('子组件beforeMount')
  },
  mounted() {
    console.log('子组件mounted')
  },
  // 子组件的beforeUpdate第4触发
  beforeUpdate() {
    console.log('LoveGirl组件要更新了~');
  },
  // 子组件的updated第5触发
  updated() {
    console.log('LoveGirl组件更新了~');
  },
  beforeDestroy() {
    console.log('子组件beforeDestroy')
  },
  destroyed() {
    console.log('子组件destoryed')
  },
  methods: {
    ok() {
      debugger;
      // this.$listeners['on-ok']()
      // this.$emit('on-ok')
      this.$parent.onOk();
    },
    cancel() {
      debugger;
      // this.$listeners['on-cancel']()
      // this.$emit('on-cancel')
      this.$parent.onCancel();
    },
    click() {
      const food = {
        name: this.name,
        power: 1000,
      }
      eventBus.emit('change-food', food);
    },
  },
};

const MyKeepAlive = {
  name: 'MyKeepAlive',
  abstract: true, // 声明为抽象组件，不会实际渲染到 DOM
  created() {
    this.cache = Object.create(null)
  },
  render() {
    // 获取要渲染的子组件
    let vnode = this.$slots.default ? this.$slots.default[0] : null;

    if (vnode) {
      if (this.cache[vnode.tag]) {
        vnode.componentInstance = this.cache[vnode.tag].componentInstance
      } else {
        this.cache[vnode.tag] = vnode
      }
      vnode.data.keepAlive = true
    }
    return vnode; // 返回组件
  },
}

// 学习插槽
const WebPage = {
  name: 'WebPage',
  template: `
    <div style="display: flex;flex-direction: column;">
      <!--头部-->
      <slot name="head">
        <div style="width: 100%;height: 100px;background-color: red;">
          <span>默认头部</span>
        </div>
      </slot>
      <!--内容-->
      <slot name="default" :girl="girl">
        <div style="width: 300px;height: 300px;background-color: darkviolet;display: flex;flex-direction: column;justify-content: center;align-items: center;">
          <span>{{girl.name}}</span>
          <span>{{girl.age}}</span>
        </div>
      </slot>
      <!--尾部-->
      <slot name="foot">
        <div style="width: 100%;height: 100px;background-color: orange;">
          <span>默认尾部</span>
        </div>
      </slot>
    </div>
  `,
  data() {
    return {
      girl: {
        name: '吕凤凤',
        age: 24,
      }
    }
  },
}


// <!--遍历loveList-->
// <my-keep-alive>
//   <LoveGirl v-if="showWhich === 1" ref="loveRef" :key="loveList[0].id" :name="loveList[0].name" :age="loveList[0].age" :description="loveList[0].description" style="margin-top: 40px;border: 1px solid orange;" v-on:on-ok="onOk" v-on:on-cancel="onCancel"></LoveGirl>
// <ShopFood v-else-if="showWhich === 2" :food="food" key="sss"></ShopFood>
// </my-keep-alive>

const myVue = new Vue({
  el: '#app',
  template: `
    <div style="display: flex;flex-direction: column;">
<!--      <span v-if="showName">{{name}}</span>-->
      <span v-show="showAge">{{age}}</span>
      <WebPage>
        <template #head>
          <div style="width: 100%;height: 300px;background-color: aquamarine">
            <span>自定义头部</span>
          </div>
        </template>
        <template #default="slotProps">
          <div style="display: flex;flex-direction: column;width: 100%;height: 500px;background-color: #5cb85c">
            <span>{{slotProps.girl.name}}</span>
            <span>{{girl.age}}</span>
          </div>
        </template>
        <template #foot>
          <div style="width: 100%;height: 300px;background-color: aquamarine">
            <span>自定义尾部</span>
          </div>
        </template>
      </WebPage>
    </div>
  `,
  components: {
    // LoveGirl,
    // ShopFood,
    // MyKeepAlive,
    WebPage,
  },
  data() {
    return {
      // showWhich: 0,
      name: 'name',
      showName: true,
      age: 25,
      showAge: true,
      girl: {
        name: '夏翀',
        age: 25,
      },
      // loveList: [
      //   {
      //     id: 1,
      //     name: '夏翀',
      //     age: 25,
      //     description: '小胖胖',
      //   },
      //   {
      //     id: 2,
      //     name: '吕凤凤',
      //     age: 24,
      //     description: '也是一个开心的小胖胖',
      //   },
      //   {
      //     id: 3,
      //     name: '黄星婷',
      //     age: 25,
      //     description: '小时候也很喜欢',
      //   },
      // ],
      // food: {
      //   name: '苹果',
      //   power: 25,
      //   price: 13,
      //   number: 60,
      // }
    }
  },
  // 主组件的watch第1时间被触发
  // watch: {
  //   loveList: {
  //     handler(value, oldValue) {
  //       console.log(`主组件发现了loveList的变化，value=${value},oldValue=${oldValue}`);
  //     },
  //     deep: true,
  //   },
  // },
  beforeCreate() {
    console.log('主组件beforeCreated');
  },
  created() {
    console.log('主组件created');
  },
  beforeMount() {
    console.log('主组件beforeMount');
  },
  mounted() {
    console.log('主组件mounted');
  },
  // 主组件的beforeUpdate第2触发
  beforeUpdate() {
    console.log('主组件要更新了~');
  },
  // 主组件的updated第6触发
  // 为什么是这个触发顺序？？？
  updated() {
    console.log('主组件更新了~');
  },
  beforeDestroy() {
    console.log('主组件beforeDestroy');
  },
  destroyed() {
    console.log('主组件destroy');
  },
  methods: {
    onOk(value) {
      console.log('父组件接收到了子组件的on-ok事件');
    },
    onCancel() {
      console.log('父组件接收到了子组件的on-cancel事件');
    },
  }
});

window.myVue = myVue;














































