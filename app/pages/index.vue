<script setup lang="ts">
const toast = useToast();

function testSuccessToast() {
  toast.success('It works!');
}

function testLoadingToast() {
  const id = toast.loading('Loading...');

  setTimeout(() => {
    toast.dismiss(id);
    toast.success('Finished!');
  }, 3000);
}

function testErrorToast() {
  toast.error('Oops!');
}

function testWarningToast() {
  toast.warning('Warning!');
}

function testInfoToast() {
  toast.info('Here is some information.');
}
</script>

<template>
  <main>
    <button type="button" @click="testSuccessToast">Test success toast</button>

    <button type="button" @click="testLoadingToast">Test loading toast</button>

    <button type="button" @click="testErrorToast">Test error toast</button>

    <button type="button" @click="testWarningToast">Test warning toast</button>

    <button type="button" @click="testInfoToast">Test info toast</button>
  </main>
</template>
