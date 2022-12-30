<template>
  <div class="SelectPanel">
    <base-select class="select" :label="label" @input="inputHandler">
      <div
        v-for="item in dataset"
        slot="item"
        :value="item[valueColumn]"
        v-text="item[titleColumn]"
      />
    </base-select>
  </div>
</template>

<script>
export default {
  name: 'PluginComponent',
  data: () => ({
    label: '',
    dataset: [],
    valueColumn: '',
    titleColumn: '',
  }),
  methods: {
    setLabel(value = '') {
      this.label = value;
    },

    setDataset(value = []) {
      this.dataset = value;
    },

    setValueColumn(value = '') {
      this.valueColumn = value;
    },

    setTitleColumn(value = '') {
      this.titleColumn = value;
    },

    inputHandler(event) {
      this.$root.publishEvent('ValueChanged', event.target.value)
    },
  },
};
</script>

<style lang="sass" scoped>
.SelectPanel
  display: flex
  justify-content: center
  align-items: center
  width: 100%
  height: 100%
  padding: 15px
  overflow: auto

  .select
    width: 100%
</style>
