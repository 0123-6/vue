debugger
const myVue = new Vue({
  el: '#app',
  template: `<div style="display: flex;flex-direction: column;"><span>{{name}}</span><span>{{age}}</span><!--遍历loveList--><span v-for="(item, index) in loveList" :key="item.id">{{item.name}}</span></div>`,
  data() {
    return {
      name: '韩佩江',
      age: 25,
      loveList: [
        {
          id: 1,
          name: '夏翀'
        },
        {
          id: 2,
          name: '吕凤凤',
        },
      ],
    }
  },
});

window.myVue = myVue;
