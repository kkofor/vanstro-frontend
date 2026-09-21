"use client";

import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from "../../../src/components/ui/dialog";
import { Button } from "../../../src/components/ui/button";
import { Input } from "../../../src/components/ui/input";

export function FixtureClient() {
  return (
    <main className="fixture-shell grid gap-6" data-testid="ui0-fixture" data-hydration="stable">
      <h1 className="text-2xl font-semibold">UI-0 浏览器候选</h1>
      <p className="legacy-sentinel" data-testid="legacy-sentinel">旧页面哨兵</p>
      <div className="flex items-center gap-3 rounded-lg p-4" data-testid="tailwind-probe">
        <Button variant="destructive" data-testid="destructive-button">删除记录</Button>
        <Input aria-label="名称" defaultValue="桌面输入" data-testid="input" />
      </div>

      <DialogRoot>
        <DialogTrigger asChild>
          <Button data-testid="open-dialog">打开对话框</Button>
        </DialogTrigger>
        <DialogContent
          data-testid="dialog-content"
          dismissOnOverlayClick
          closeLabel="关闭对话框"
          showCloseLabel
        >
          <DialogTitle>编辑库存</DialogTitle>
          <DialogDescription>更新当前库存记录。</DialogDescription>
          <Input aria-label="库存名称" defaultValue="基础柜" data-testid="dialog-input" />
          <Button data-testid="dialog-action">保存</Button>
          <DialogRoot>
            <DialogTrigger asChild>
              <Button variant="secondary" data-testid="open-nested">打开嵌套对话框</Button>
            </DialogTrigger>
            <DialogContent data-testid="nested-content" closeLabel="关闭嵌套对话框" showCloseLabel>
              <DialogTitle>嵌套确认</DialogTitle>
              <DialogDescription>仅关闭当前嵌套层。</DialogDescription>
              <DialogClose asChild>
                <Button data-testid="close-nested">关闭嵌套</Button>
              </DialogClose>
            </DialogContent>
          </DialogRoot>
          <DialogClose asChild>
            <Button variant="secondary" data-testid="close-dialog">关闭</Button>
          </DialogClose>
        </DialogContent>
      </DialogRoot>
      <DialogRoot>
        <DialogTrigger asChild>
          <Button variant="secondary" data-testid="open-safe-dialog">打开安全对话框</Button>
        </DialogTrigger>
        <DialogContent data-testid="safe-dialog-content" closeLabel="关闭安全对话框">
          <DialogTitle>安全编辑</DialogTitle>
          <DialogDescription>默认点击遮罩不会关闭。</DialogDescription>
          <DialogClose asChild>
            <Button data-testid="close-safe-dialog">关闭安全对话框</Button>
          </DialogClose>
        </DialogContent>
      </DialogRoot>
      <div className="forced-colors-sentinel" data-testid="forced-colors-probe">强制颜色边界</div>
    </main>
  );
}
