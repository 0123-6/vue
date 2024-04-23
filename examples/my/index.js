debugger
const myVue = new Vue({
  el: '#app',
  template: `<div style="display: flex;flex-direction: column;"><span>{{name}}</span><span>{{age}}</span></div>`,
  data() {
    return {
      name: '韩佩江',
      age: 25,
    }
  },
});

window.myVue = myVue;
